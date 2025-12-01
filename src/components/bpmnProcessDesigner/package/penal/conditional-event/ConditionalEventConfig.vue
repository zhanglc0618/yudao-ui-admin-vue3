<template>
  <div class="panel-tab__content">
    <el-form-item label="事件条件">
      <el-input
        v-model="conditionExpression"
        placeholder="请输入条件表达式"
        @blur="updateCondition"
        style="width: 100%"
      >
        <template #prepend>${</template>
        <template #append>}</template>
      </el-input>
    </el-form-item>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, nextTick } from 'vue'

defineOptions({ name: 'ConditionalEventConfig' })

const props = defineProps({
  id: String,
  type: String,
  businessObject: {
    type: Object,
    default: () => ({})
  }
})

const conditionExpression = ref('')

const bpmnInstances = () => (window as any).bpmnInstances

const getConditionExpression = () => {
  const instances = bpmnInstances()
  if (!instances || !instances.bpmnElement) return

  // 获取原始的 bpmnElement，避免Vue响应式代理
  const bpmnElement = instances.bpmnElement

  // 获取事件定义中的条件
  const eventDefinitions = bpmnElement.businessObject?.eventDefinitions
  if (eventDefinitions && eventDefinitions.length > 0) {
    const conditionalEventDef = eventDefinitions[0]
    // 获取条件表达式
    const condition = conditionalEventDef?.condition
    if (condition && condition.body) {
      // 移除 ${ 和 } 前缀后缀
      let bodyText = condition.body
      if (bodyText.startsWith('${') && bodyText.endsWith('}')) {
        bodyText = bodyText.substring(2, bodyText.length - 1)
      }
      conditionExpression.value = bodyText
    } else {
      conditionExpression.value = ''
    }
  } else {
    conditionExpression.value = ''
  }
}

const updateCondition = () => {
  nextTick(() => {
    try {
      const instances = bpmnInstances()
      if (!instances || !instances.bpmnElement) return

      // 获取原始的 bpmnElement
      const bpmnElement = instances.bpmnElement
      const eventDefinitions = bpmnElement.businessObject?.eventDefinitions

      if (!eventDefinitions || eventDefinitions.length === 0) {
        return
      }

      const conditionalEventDef = eventDefinitions[0]

      // 构建完整的条件表达式
      const fullExpression = conditionExpression.value
        ? `\${${conditionExpression.value}}`
        : ''

      // 创建或更新条件对象
      if (fullExpression) {
        const conditionProps = {
          body: fullExpression,
          language: undefined // 可以根据需要设置语言类型
        }

        // 如果条件已存在，更新它
        if (conditionalEventDef.condition) {
          instances.modeling.updateModdleProperties(
            bpmnElement,
            conditionalEventDef.condition,
            conditionProps
          )
        } else {
          // 创建新的条件对象
          const condition = instances.moddle.create('bpmn:FormalExpression', conditionProps)
          instances.modeling.updateModdleProperties(
            bpmnElement,
            conditionalEventDef,
            { condition }
          )
        }
      } else {
        // 如果表达式为空，清空条件
        if (conditionalEventDef.condition) {
          instances.modeling.updateModdleProperties(
            bpmnElement,
            conditionalEventDef,
            { condition: undefined }
          )
        }
      }
    } catch (error) {
      console.error('更新条件表达式失败:', error)
    }
  })
}

onMounted(() => {
  nextTick(() => {
    getConditionExpression()
  })
})


watch(
  () => props.id,
  () => {
    nextTick(() => {
      getConditionExpression()
    })
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.panel-tab__content {
  padding: 0;
}
</style>

