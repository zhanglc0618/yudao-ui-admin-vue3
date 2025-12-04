<template>
  <div class="panel-tab__content">
    <el-form-item label="信号选择">
      <el-select
        v-model="bindSignalId"
        @change="updateEventSignal"
        placeholder="请选择信号"
        style="width: 100%"
      >
        <el-option
          v-for="key in Object.keys(signalMap)"
          :value="key"
          :label="signalMap[key]"
          :key="key"
        />
      </el-select>
      <div v-if="showEmptyTip" class="empty-tip">
        <Icon icon="ep:warning-filled" />
        信号列表为空，请到流程属性中增加
      </div>
    </el-form-item>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'SignalEventConfig' })

const props = defineProps({
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindSignalId = ref('')
const signalMap = ref<any>({})
const bpmnSignalRefsMap = ref<any>()
const lastBusinessObjectId = ref('') // 记录上次的 businessObject id

const showEmptyTip = computed(() => {
  return Object.keys(signalMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

// 从 businessObject 同步信号列表
const syncSignalList = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.modeler) {
    return
  }

  bpmnSignalRefsMap.value = Object.create(null)
  const rootElements = instances.modeler.getDefinitions().rootElements

  // 重置信号列表，先添加"无"选项
  signalMap.value = { '-1': '无' }

  // 获取所有信号
  rootElements
    .filter((el) => el.$type === 'bpmn:Signal')
    .forEach((s) => {
      bpmnSignalRefsMap.value[s.id] = s
      signalMap.value[s.id] = s.name
    })
}

// 从 businessObject 同步绑定的信号（不重新加载信号列表）
const syncBindSignal = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.elementRegistry) {
    bindSignalId.value = '-1'
    return
  }

  const bo: any = props.businessObject
  if (!bo || !bo.id) {
    bindSignalId.value = '-1'
    return
  }

  // 从 elementRegistry 获取最新的 element，而不是使用 props.businessObject（它是快照）
  const element = instances.elementRegistry.get(bo.id)
  if (!element || !element.businessObject) {
    bindSignalId.value = '-1'
    return
  }

  // 获取事件定义中的信号引用
  const eventDefinitions = element.businessObject.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const signalEventDef = eventDefinitions[0]
    bindSignalId.value = signalEventDef?.signalRef?.id || '-1'
  } else {
    bindSignalId.value = '-1'
  }
}

// 完整同步：信号列表 + 绑定的信号
const syncFromBusinessObject = () => {
  const instances = bpmnInstances()
  if (!instances) return

  // 同步信号列表
  syncSignalList()

  if (!props.businessObject) {
    bindSignalId.value = '-1'
    lastBusinessObjectId.value = ''
    return
  }

  // 记录当前的 businessObject id
  lastBusinessObjectId.value = props.businessObject.id || ''

  // 同步绑定的信号
  syncBindSignal()
}

const updateEventSignal = (signalId) => {
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

  const signalEventDef = eventDefinitions[0]

  if (signalId === '-1') {
    // 清空信号引用
    modeling.updateModdleProperties(element, signalEventDef, {
      signalRef: null
    })
  } else {
    // 设置信号引用
    modeling.updateModdleProperties(element, signalEventDef, {
      signalRef: bpmnSignalRefsMap.value[signalId]
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
        // 同一个元素，只更新信号列表（处理信号增删改的情况）
        syncSignalList()
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
