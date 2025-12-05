<template>
  <div class="panel-tab__content">
    <el-form-item label="升级选择">
      <el-select
        v-model="bindEscalationId"
        @change="updateEventEscalation"
        placeholder="请选择升级"
        style="width: 100%"
      >
        <el-option
          v-for="key in Object.keys(escalationMap)"
          :value="key"
          :label="escalationMap[key]"
          :key="key"
        />
      </el-select>
      <div v-if="showEmptyTip" class="empty-tip">
        <Icon icon="ep:warning-filled" />
        升级列表为空，请到流程属性中增加
      </div>
    </el-form-item>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'EscalationEventConfig' })

const props = defineProps({
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindEscalationId = ref('')
const escalationMap = ref<any>({})
const bpmnEscalationRefsMap = ref<any>()
const lastBusinessObjectId = ref('') // 记录上次的 businessObject id

const showEmptyTip = computed(() => {
  return Object.keys(escalationMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

// 从 businessObject 同步升级列表
const syncEscalationList = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.modeler) {
    return
  }

  bpmnEscalationRefsMap.value = Object.create(null)
  const rootElements = instances.modeler.getDefinitions().rootElements

  // 重置升级列表，先添加"无"选项
  escalationMap.value = { '-1': '无' }

  // 获取所有升级
  rootElements
    .filter((el) => el.$type === 'bpmn:Escalation')
    .forEach((e) => {
      bpmnEscalationRefsMap.value[e.id] = e
      escalationMap.value[e.id] = e.name
    })
}

// 从 businessObject 同步绑定的升级（不重新加载升级列表）
const syncBindEscalation = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.elementRegistry) {
    bindEscalationId.value = '-1'
    return
  }

  const bo: any = props.businessObject
  if (!bo || !bo.id) {
    bindEscalationId.value = '-1'
    return
  }

  // 从 elementRegistry 获取最新的 element，而不是使用 props.businessObject（它是快照）
  const element = instances.elementRegistry.get(bo.id)
  if (!element || !element.businessObject) {
    bindEscalationId.value = '-1'
    return
  }

  // 获取事件定义中的升级引用
  const eventDefinitions = element.businessObject.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const escalationEventDef = eventDefinitions[0]
    bindEscalationId.value = escalationEventDef?.escalationRef?.id || '-1'
  } else {
    bindEscalationId.value = '-1'
  }
}

// 完整同步：升级列表 + 绑定的升级
const syncFromBusinessObject = () => {
  const instances = bpmnInstances()
  if (!instances) return

  // 同步升级列表
  syncEscalationList()

  if (!props.businessObject) {
    bindEscalationId.value = '-1'
    lastBusinessObjectId.value = ''
    return
  }

  // 记录当前的 businessObject id
  lastBusinessObjectId.value = props.businessObject.id || ''

  // 同步绑定的升级
  syncBindEscalation()
}

const updateEventEscalation = (escalationId) => {
  const instances = bpmnInstances()
  if (!instances) return

  const { modeling, elementRegistry } = instances
  if (!modeling || !elementRegistry) return

  const bo: any = props.businessObject
  if (!bo || !bo.id) return

  const element = elementRegistry.get(bo.id)
  if (!element) return

  const eventDefinitions = element.businessObject?.eventDefinitions
  if (!eventDefinitions || eventDefinitions.length === 0) {
    return
  }

  const escalationEventDef = eventDefinitions[0]

  if (escalationId === '-1') {
    // 清空升级引用
    modeling.updateModdleProperties(element, escalationEventDef, {
      escalationRef: null
    })
  } else {
    // 设置升级引用
    modeling.updateModdleProperties(element, escalationEventDef, {
      escalationRef: bpmnEscalationRefsMap.value[escalationId]
    })
  }
}

onMounted(() => {
  syncFromBusinessObject()
})

watch(
  () => props.businessObject,
  (val) => {
    if (val) {
      // 只在 businessObject 的 id 发生变化时才重新同步
      const currentId = val.id || ''
      if (currentId !== lastBusinessObjectId.value) {
        nextTick(() => {
          syncFromBusinessObject()
        })
      } else {
        // 同一个元素，只更新升级列表（处理升级增删改的情况）
        syncEscalationList()
      }
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.panel-tab__content {
  padding: 0;
}

.empty-tip {
  margin-top: 8px;
  color: #e6a23c;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
