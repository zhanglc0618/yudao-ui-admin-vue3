<template>
  <div class="panel-tab__content">
    <el-form-item label="消息选择">
      <el-select
        v-model="bindMessageId"
        @change="updateEventMessage"
        placeholder="请选择消息"
        style="width: 100%"
      >
        <el-option
          v-for="key in Object.keys(messageMap)"
          :value="key"
          :label="messageMap[key]"
          :key="key"
        />
      </el-select>
      <div v-if="showEmptyTip" class="empty-tip">
        <Icon icon="ep:warning-filled" />
        消息列表为空，请到流程属性中增加
      </div>
    </el-form-item>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'MessageEventConfig' })

const props = defineProps({
  id: String,
  type: String,
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindMessageId = ref('')
const messageMap = ref<any>({})
const bpmnElement = ref<any>()
const bpmnMessageRefsMap = ref<any>()
const bpmnRootElements = ref<any>()
const isUpdating = ref(false) // 添加更新标志位

const showEmptyTip = computed(() => {
  return Object.keys(messageMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

const getBindMessage = () => {
  // 如果正在更新，跳过获取，避免干扰下拉框
  if (isUpdating.value) return

  const instances = bpmnInstances()
  if (!instances || !instances.bpmnElement) return

  bpmnElement.value = instances.bpmnElement
  // 获取事件定义中的消息引用
  const eventDefinitions = bpmnElement.value.businessObject?.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const messageEventDef = eventDefinitions[0]
    bindMessageId.value = messageEventDef?.messageRef?.id || '-1'
  } else {
    bindMessageId.value = '-1'
  }
}

const updateEventMessage = (messageId) => {
  // 设置更新标志，防止 getBindMessage 干扰
  isUpdating.value = true

  nextTick(() => {
    try {
      const eventDefinitions = bpmnElement.value?.businessObject?.eventDefinitions
      if (!eventDefinitions || eventDefinitions.length === 0) {
        isUpdating.value = false
        return
      }

      const messageEventDef = eventDefinitions[0]

      if (messageId === '-1') {
        // 清空消息引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, messageEventDef, {
          messageRef: null
        })
      } else {
        // 设置消息引用
        bpmnInstances().modeling.updateModdleProperties(bpmnElement.value, messageEventDef, {
          messageRef: bpmnMessageRefsMap.value[messageId]
        })
      }
    } catch (error) {
      console.error('更新消息引用失败:', error)
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

  bpmnMessageRefsMap.value = Object.create(null)
  bpmnRootElements.value = instances.modeler.getDefinitions().rootElements

  // 先添加"无"选项
  messageMap.value['-1'] = '无'

  // 获取所有消息
  bpmnRootElements.value
    .filter((el) => el.$type === 'bpmn:Message')
    .forEach((m) => {
      bpmnMessageRefsMap.value[m.id] = m
      messageMap.value[m.id] = m.name
    })
})

onBeforeUnmount(() => {
  bpmnElement.value = null
})

watch(
  () => props.id,
  () => {
    nextTick(() => {
      getBindMessage()
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
