<template>
  <div class="panel-tab__content">
    <el-form-item label="错误选择">
      <el-select
        v-model="bindErrorId"
        @change="updateEventError"
        placeholder="请选择错误"
        style="width: 100%"
      >
        <el-option
          v-for="key in Object.keys(errorMap)"
          :value="key"
          :label="errorMap[key]"
          :key="key"
        />
      </el-select>
      <div v-if="showEmptyTip" class="empty-tip">
        <Icon icon="ep:warning-filled" />
        错误列表为空，请到流程属性中增加
      </div>
    </el-form-item>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'ErrorEventConfig' })

const props = defineProps({
  id: String,
  type: String,
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindErrorId = ref('')
const errorMap = ref<any>({})
const bpmnElement = ref<any>()
const bpmnErrorRefsMap = ref<any>()
const bpmnRootElements = ref<any>()
const isUpdating = ref(false) // 添加更新标志位

const showEmptyTip = computed(() => {
  return Object.keys(errorMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

const getBindError = () => {
  // 如果正在更新，跳过获取，避免干扰下拉框
  if (isUpdating.value) return

  const instances = bpmnInstances()
  if (!instances || !instances.bpmnElement) return

  bpmnElement.value = instances.bpmnElement
  // 获取事件定义中的错误引用
  const eventDefinitions = bpmnElement.value.businessObject?.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const errorEventDef = eventDefinitions[0]
    bindErrorId.value = errorEventDef?.errorRef?.id || '-1'
  } else {
    bindErrorId.value = '-1'
  }
}

const updateEventError = (errorId) => {
  // 设置更新标志，防止 getBindError 干扰
  isUpdating.value = true

  nextTick(() => {
    try {
      const eventDefinitions = bpmnElement.value?.businessObject?.eventDefinitions
      if (!eventDefinitions || eventDefinitions.length === 0) {
        isUpdating.value = false
        return
      }

      const errorEventDef = eventDefinitions[0]

      if (errorId === '-1') {
        // 清空错误引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, errorEventDef, {
          errorRef: null
        })
      } else {
        // 设置错误引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, errorEventDef, {
          errorRef: bpmnErrorRefsMap.value[errorId]
        })
      }
    } catch (error) {
      console.error('更新错误引用失败:', error)
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

  bpmnErrorRefsMap.value = Object.create(null)
  bpmnRootElements.value = instances.modeler.getDefinitions().rootElements

  // 先添加"无"选项
  errorMap.value['-1'] = '无'

  // 获取所有错误
  bpmnRootElements.value
    .filter((el) => el.$type === 'bpmn:Error')
    .forEach((m) => {
      bpmnErrorRefsMap.value[m.id] = m
      errorMap.value[m.id] = m.name
    })
})

onBeforeUnmount(() => {
  bpmnElement.value = null
})

watch(
  () => props.id,
  () => {
    nextTick(() => {
      getBindError()
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
