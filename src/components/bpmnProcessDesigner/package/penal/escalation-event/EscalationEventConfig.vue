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
  id: String,
  type: String,
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindEscalationId = ref('')
const escalationMap = ref<any>({})
const bpmnElement = ref<any>()
const bpmnEscalationRefsMap = ref<any>()
const bpmnRootElements = ref<any>()
const isUpdating = ref(false) // 添加更新标志位

const showEmptyTip = computed(() => {
  return Object.keys(escalationMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

const getBindEscalation = () => {
  // 如果正在更新，跳过获取，避免干扰下拉框
  if (isUpdating.value) return

  const instances = bpmnInstances()
  if (!instances || !instances.bpmnElement) return

  bpmnElement.value = instances.bpmnElement
  // 获取事件定义中的升级引用
  const eventDefinitions = bpmnElement.value.businessObject?.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const escalationEventDef = eventDefinitions[0]
    bindEscalationId.value = escalationEventDef?.escalationRef?.id || '-1'
  } else {
    bindEscalationId.value = '-1'
  }
}

const updateEventEscalation = (escalationId) => {
  // 设置更新标志，防止 getBindEscalation 干扰
  isUpdating.value = true

  nextTick(() => {
    try {
      const eventDefinitions = bpmnElement.value?.businessObject?.eventDefinitions
      if (!eventDefinitions || eventDefinitions.length === 0) {
        isUpdating.value = false
        return
      }

      const escalationEventDef = eventDefinitions[0]

      if (escalationId === '-1') {
        // 清空升级引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, escalationEventDef, {
          escalationRef: null
        })
      } else {
        // 设置升级引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, escalationEventDef, {
          escalationRef: bpmnEscalationRefsMap.value[escalationId]
        })
      }
    } catch (error) {
      console.error('更新升级引用失败:', error)
    } finally {
      // 延迟重置标志位，确保事件处理完成
      setTimeout(() => {
        isUpdating.value = false
      }, 100)
    }
  })
}

onMounted(() => {
  const instances = bpmnInstances()
  if (!instances || !instances.modeler) {
    console.error('BPMN实例未初始化')
    return
  }

  bpmnEscalationRefsMap.value = Object.create(null)
  bpmnRootElements.value = instances.modeler.getDefinitions().rootElements

  // 先添加"无"选项
  escalationMap.value['-1'] = '无'

  // 获取所有升级
  bpmnRootElements.value
    .filter((el) => el.$type === 'bpmn:Escalation')
    .forEach((m) => {
      bpmnEscalationRefsMap.value[m.id] = m
      escalationMap.value[m.id] = m.name
    })
})

onBeforeUnmount(() => {
  bpmnElement.value = null
})

watch(
  () => props.id,
  () => {
    nextTick(() => {
      getBindEscalation()
    })
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
