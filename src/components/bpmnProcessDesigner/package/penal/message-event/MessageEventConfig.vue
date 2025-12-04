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
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const bindMessageId = ref('')
const messageMap = ref<any>({})
const bpmnMessageRefsMap = ref<any>()
const lastBusinessObjectId = ref('') // 记录上次的 businessObject id

const showEmptyTip = computed(() => {
  return Object.keys(messageMap.value).length === 1 // 只有"无"选项
})

const bpmnInstances = () => (window as any).bpmnInstances

// 从 businessObject 同步消息列表
const syncMessageList = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.modeler) {
    return
  }

  bpmnMessageRefsMap.value = Object.create(null)
  const rootElements = instances.modeler.getDefinitions().rootElements

  // 重置消息列表，先添加"无"选项
  messageMap.value = { '-1': '无' }

  // 获取所有消息
  rootElements
    .filter((el) => el.$type === 'bpmn:Message')
    .forEach((m) => {
      bpmnMessageRefsMap.value[m.id] = m
      messageMap.value[m.id] = m.name
    })
}

// 从 businessObject 同步绑定的消息（不重新加载消息列表）
const syncBindMessage = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.elementRegistry) {
    bindMessageId.value = '-1'
    return
  }

  const bo: any = props.businessObject
  if (!bo || !bo.id) {
    bindMessageId.value = '-1'
    return
  }

  // 从 elementRegistry 获取最新的 element，而不是使用 props.businessObject（它是快照）
  const element = instances.elementRegistry.get(bo.id)
  if (!element || !element.businessObject) {
    bindMessageId.value = '-1'
    return
  }

  // 获取事件定义中的消息引用
  const eventDefinitions = element.businessObject.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const messageEventDef = eventDefinitions[0]
    bindMessageId.value = messageEventDef?.messageRef?.id || '-1'
  } else {
    bindMessageId.value = '-1'
  }
}

// 完整同步：消息列表 + 绑定的消息
const syncFromBusinessObject = () => {
  const instances = bpmnInstances()
  if (!instances) return

  // 同步消息列表
  syncMessageList()

  if (!props.businessObject) {
    bindMessageId.value = '-1'
    lastBusinessObjectId.value = ''
    return
  }

  // 记录当前的 businessObject id
  lastBusinessObjectId.value = props.businessObject.id || ''

  // 同步绑定的消息
  syncBindMessage()
}

const updateEventMessage = (messageId) => {
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

  const messageEventDef = eventDefinitions[0]

  if (messageId === '-1') {
    // 清空消息引用
    modeling.updateModdleProperties(element, messageEventDef, {
      messageRef: null
    })
  } else {
    // 设置消息引用
    modeling.updateModdleProperties(element, messageEventDef, {
      messageRef: bpmnMessageRefsMap.value[messageId]
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
        // 同一个元素，只更新消息列表（处理消息增删改的情况）
        syncMessageList()
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
