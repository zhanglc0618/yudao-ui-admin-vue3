<template>
  <div class="process-panel__container" :style="{ width: `${width}px`, maxHeight: '600px' }">
    <!-- 切换按钮 -->
    <div class="panel-toggle-btn" @click="togglePanel">
      <Icon :icon="isPanelVisible ? 'ep:d-arrow-right' : 'ep:d-arrow-left'" />
    </div>
    <!-- 属性面板 -->
    <transition name="slide-fade">
      <div
        v-show="isPanelVisible"
        class="process-panel__container"
        :style="{ width: `${width}px` }"
      >
        <el-collapse v-model="activeTab" v-if="isReady">
          <el-collapse-item name="base">
            <!-- class="panel-tab__title" -->
            <template #title>
              <Icon icon="ep:info-filled" />
              常规</template
            >
            <ElementBaseInfo
              :id-edit-disabled="idEditDisabled"
              :business-object="elementBusinessObject"
              :type="elementType"
              :model="model"
            />
          </el-collapse-item>
          <!-- 时间事件配置 - 排在常规之后的第二栏 -->
          <el-collapse-item v-if="isTimerIntermediateCatchEvent" name="timeEvent" key="timeEvent">
            <template #title><Icon icon="ep:timer" />时间事件</template>
            <TimeEventConfig :businessObject="elementBusinessObject" :key="elementId" />
          </el-collapse-item>
          <!-- 消息属性配置 - 排在常规之后的第二栏 -->
          <el-collapse-item
            v-if="isMessageIntermediateCatchEvent"
            name="messageEvent"
            key="messageEvent"
          >
            <template #title><Icon icon="ep:message" />消息事件</template>
            <MessageEventConfig
              :id="elementId"
              :type="elementType"
              :business-object="elementBusinessObject"
            />
          </el-collapse-item>
          <!-- 信号属性配置 - 排在常规之后的第二栏 -->
          <el-collapse-item
            v-if="isSignalIntermediateCatchEvent"
            name="signalEvent"
            key="signalEvent"
          >
            <template #title><Icon icon="ep:notification" />信号事件</template>
            <SignalEventConfig
              :id="elementId"
              :type="elementType"
              :business-object="elementBusinessObject"
            />
          </el-collapse-item>
          <el-collapse-item name="condition" v-if="elementType === 'Process'" key="message">
            <template #title><Icon icon="ep:comment" />消息与信号</template>
            <signal-and-massage />
          </el-collapse-item>
          <el-collapse-item name="condition" v-if="conditionFormVisible" key="condition">
            <template #title><Icon icon="ep:promotion" />流转条件</template>
            <flow-condition :business-object="elementBusinessObject" :type="elementType" />
          </el-collapse-item>
          <!-- 表单配置已隐藏 -->
          <!-- <el-collapse-item name="condition" v-if="formVisible" key="form">
          <template #title><Icon icon="ep:list" />表单</template>
          <element-form :id="elementId" :type="elementType" />
        </el-collapse-item> -->
          <el-collapse-item name="task" v-if="isTaskCollapseItemShow(elementType)" key="task">
            <template #title
              ><Icon icon="ep:checked" />{{ getTaskCollapseItemName(elementType) }}</template
            >
            <element-task :id="elementId" :type="elementType" />
          </el-collapse-item>
          <el-collapse-item
            name="multiInstance"
            v-if="elementType === 'UserTask'"
            key="multiInstance"
          >
            <template #title><Icon icon="ep:help-filled" />多人审批方式</template>
            <element-multi-instance
              :id="elementId"
              :business-object="elementBusinessObject"
              :type="elementType"
            />
          </el-collapse-item>
          <el-collapse-item name="listeners" key="listeners">
            <template #title><Icon icon="ep:bell-filled" />执行监听器</template>
            <element-listeners :id="elementId" :type="elementType" />
          </el-collapse-item>
          <el-collapse-item
            name="taskListeners"
            v-if="elementType === 'UserTask'"
            key="taskListeners"
          >
            <template #title><Icon icon="ep:bell-filled" />任务监听器</template>
            <user-task-listeners :id="elementId" :type="elementType" />
          </el-collapse-item>
          <el-collapse-item name="extensions" key="extensions">
            <template #title><Icon icon="ep:circle-plus-filled" />扩展属性</template>
            <element-properties :id="elementId" :type="elementType" />
          </el-collapse-item>
          <el-collapse-item name="other" key="other">
            <template #title><Icon icon="ep:promotion" />其他</template>
            <element-other-config :id="elementId" />
          </el-collapse-item>
          <el-collapse-item name="customConfig" key="customConfig">
            <template #title><Icon icon="ep:tools" />自定义配置</template>
            <element-custom-config
              :id="elementId"
              :type="elementType"
              :business-object="elementBusinessObject"
            />
          </el-collapse-item>
        </el-collapse>
      </div>
    </transition>
  </div>
</template>
<script lang="ts" setup>
import ElementBaseInfo from './base/ElementBaseInfo.vue'
import ElementOtherConfig from './other/ElementOtherConfig.vue'
import ElementTask from './task/ElementTask.vue'
import ElementMultiInstance from './multi-instance/ElementMultiInstance.vue'
import FlowCondition from './flow-condition/FlowCondition.vue'
import SignalAndMassage from './signal-message/SignalAndMessage.vue'
import ElementListeners from './listeners/ElementListeners.vue'
import ElementProperties from './properties/ElementProperties.vue'
// import ElementForm from './form/ElementForm.vue'
import UserTaskListeners from './listeners/UserTaskListeners.vue'
import { getTaskCollapseItemName, isTaskCollapseItemShow } from './task/data'
import TimeEventConfig from './time-event-config/TimeEventConfig.vue'
import MessageEventConfig from './message-event/MessageEventConfig.vue'
import SignalEventConfig from './signal-event/SignalEventConfig.vue'
import { ref, watch, computed } from 'vue'

defineOptions({ name: 'MyPropertiesPanel' })

/**
 * 侧边栏
 * @Author MiyueFE
 * @Home https://github.com/miyuesc
 * @Date 2021年3月31日18:57:51
 */
const props = defineProps({
  bpmnModeler: {
    type: Object,
    default: () => {}
  },
  prefix: {
    type: String,
    default: 'camunda'
  },
  width: {
    type: Number,
    default: 480
  },
  idEditDisabled: {
    type: Boolean,
    default: false
  },
  model: Object // 流程模型的数据
})

const activeTab = ref('base')
const elementId = ref('')
const elementType = ref('')
const elementBusinessObject = ref<any>({}) // 元素 businessObject 镜像，提供给需要做判断的组件使用
const conditionFormVisible = ref(false) // 流转条件设置
const formVisible = ref(false) // 表单配置
const bpmnElement = ref()
const isReady = ref(false)
const isPanelVisible = ref(false) // 属性面板默认隐藏

const type = ref('time')
const condition = ref('')
provide('prefix', props.prefix)
provide('width', props.width)

// 切换属性面板显示/隐藏
const togglePanel = () => {
  isPanelVisible.value = !isPanelVisible.value
}

// 判断是否为定时器中间捕获事件（排除消息和信号事件）
const isTimerIntermediateCatchEvent = computed(() => {
  if (elementType.value !== 'IntermediateCatchEvent') return false

  const eventDefinitions = elementBusinessObject.value?.eventDefinitions
  if (!eventDefinitions || eventDefinitions.length === 0) return false

  const eventDefType = eventDefinitions[0]?.$type
  // 只显示定时器事件，排除消息和信号事件
  return eventDefType === 'bpmn:TimerEventDefinition'
})

// 判断是否为消息中间捕获事件
const isMessageIntermediateCatchEvent = computed(() => {
  if (elementType.value !== 'IntermediateCatchEvent') return false

  const eventDefinitions = elementBusinessObject.value?.eventDefinitions
  if (!eventDefinitions || eventDefinitions.length === 0) return false

  const eventDefType = eventDefinitions[0]?.$type
  return eventDefType === 'bpmn:MessageEventDefinition'
})

// 判断是否为信号中间捕获事件
const isSignalIntermediateCatchEvent = computed(() => {
  if (elementType.value !== 'IntermediateCatchEvent') return false

  const eventDefinitions = elementBusinessObject.value?.eventDefinitions
  if (!eventDefinitions || eventDefinitions.length === 0) return false

  const eventDefType = eventDefinitions[0]?.$type
  return eventDefType === 'bpmn:SignalEventDefinition'
})

// 初始化 bpmnInstances
const initBpmnInstances = () => {
  if (!props.bpmnModeler) return false
  try {
    const instances = {
      modeler: props.bpmnModeler,
      modeling: props.bpmnModeler.get('modeling'),
      moddle: props.bpmnModeler.get('moddle'),
      eventBus: props.bpmnModeler.get('eventBus'),
      bpmnFactory: props.bpmnModeler.get('bpmnFactory'),
      elementFactory: props.bpmnModeler.get('elementFactory'),
      elementRegistry: props.bpmnModeler.get('elementRegistry'),
      replace: props.bpmnModeler.get('replace'),
      selection: props.bpmnModeler.get('selection')
    }

    // 检查所有实例是否都存在
    const allInstancesExist = Object.values(instances).every((instance) => instance)
    if (allInstancesExist) {
      const w = window as any
      w.bpmnInstances = instances
      return true
    }
    return false
  } catch (error) {
    console.error('初始化 bpmnInstances 失败:', error)
    return false
  }
}

const bpmnInstances = () => (window as any)?.bpmnInstances

// 监听 props.bpmnModeler 然后 initModels
const unwatchBpmn = watch(
  () => props.bpmnModeler,
  async () => {
    // 避免加载时 流程图 并未加载完成
    if (!props.bpmnModeler) {
      console.log('缺少props.bpmnModeler')
      return
    }

    try {
      // 等待 modeler 初始化完成
      await nextTick()
      if (initBpmnInstances()) {
        isReady.value = true
        await nextTick()
        getActiveElement()
      } else {
        console.error('modeler 实例未完全初始化')
      }
    } catch (error) {
      console.error('初始化失败:', error)
    }
  },
  {
    immediate: true
  }
)

const getActiveElement = () => {
  if (!isReady.value || !props.bpmnModeler) return

  // 初始第一个选中元素 bpmn:Process
  initFormOnChanged(null)
  props.bpmnModeler.on('import.done', (e) => {
    console.log(e, 'eeeee')
    initFormOnChanged(null)
  })
  // 监听选择事件，修改当前激活的元素以及表单
  props.bpmnModeler.on('selection.changed', ({ newSelection }) => {
    initFormOnChanged(newSelection[0] || null)
  })
  props.bpmnModeler.on('element.changed', ({ element }) => {
    // 保证 修改 "默认流转路径" 类似需要修改多个元素的事件发生的时候，更新表单的元素与原选中元素不一致。
    if (element && element.id === elementId.value) {
      initFormOnChanged(element)
    }
  })
}

// 初始化数据
const initFormOnChanged = (element) => {
  if (!isReady.value || !bpmnInstances()) return

  let activatedElement = element
  if (!activatedElement) {
    activatedElement =
      bpmnInstances().elementRegistry.find((el) => el.type === 'bpmn:Process') ??
      bpmnInstances().elementRegistry.find((el) => el.type === 'bpmn:Collaboration')
  }
  if (!activatedElement) return

  try {
    console.log(`
                ----------
        select element changed:
                  id:  ${activatedElement.id}
                type:  ${activatedElement.businessObject.$type}
                ----------
                `)
    console.log('businessObject: ', activatedElement.businessObject)
    bpmnInstances().bpmnElement = activatedElement
    bpmnElement.value = activatedElement
    elementId.value = activatedElement.id
    elementType.value = activatedElement.type.split(':')[1] || ''
    elementBusinessObject.value = JSON.parse(JSON.stringify(activatedElement.businessObject))
    conditionFormVisible.value = !!(
      elementType.value === 'SequenceFlow' &&
      activatedElement.source &&
      activatedElement.source.type.indexOf('StartEvent') === -1
    )
    formVisible.value = elementType.value === 'UserTask' || elementType.value === 'StartEvent'

    // 当选中元素时自动展开属性面板（用户主动选择的元素才展开）
    if (element) {
      isPanelVisible.value = true
    }
  } catch (error) {
    console.error('初始化表单数据失败:', error)
  }
}

onBeforeUnmount(() => {
  const w = window as any
  w.bpmnInstances = null
  isReady.value = false
})

watch(
  () => elementId.value,
  () => {
    activeTab.value = 'base'
  }
)

function updateNode() {
  const moddle = window.bpmnInstances?.moddle
  const modeling = window.bpmnInstances?.modeling
  const elementRegistry = window.bpmnInstances?.elementRegistry
  if (!moddle || !modeling || !elementRegistry) return

  const element = elementRegistry.get(props.businessObject.id)
  if (!element) return

  let timerDef = moddle.create('bpmn:TimerEventDefinition', {})
  if (type.value === 'time') {
    timerDef.timeDate = moddle.create('bpmn:FormalExpression', { body: condition.value })
  } else if (type.value === 'duration') {
    timerDef.timeDuration = moddle.create('bpmn:FormalExpression', { body: condition.value })
  } else if (type.value === 'cycle') {
    timerDef.timeCycle = moddle.create('bpmn:FormalExpression', { body: condition.value })
  }

  modeling.updateModdleProperties(element, element.businessObject, {
    eventDefinitions: [timerDef]
  })
}

// 初始化和监听
function syncFromBusinessObject() {
  if (props.businessObject) {
    const timerDef = (props.businessObject.eventDefinitions || [])[0]
    if (timerDef) {
      if (timerDef.timeDate) {
        type.value = 'time'
        condition.value = timerDef.timeDate.body
      } else if (timerDef.timeDuration) {
        type.value = 'duration'
        condition.value = timerDef.timeDuration.body
      } else if (timerDef.timeCycle) {
        type.value = 'cycle'
        condition.value = timerDef.timeCycle.body
      }
    }
  }
}
onMounted(syncFromBusinessObject)
watch(() => props.businessObject, syncFromBusinessObject, { deep: true })

</script>

<style lang="scss" scoped>
.process-panel__wrapper {
  position: fixed;
  top: 172px;
  right: 0;
  bottom: 20px;
  height: auto;
  max-height: calc(100vh - 192px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
}

.panel-toggle-btn {
  position: absolute;
  left: -32px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 80px;
  background-color: #d3d3d3;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #b8b8b8;
    left: -34px;
  }

  :deep(.icon) {
    color: #fff;
    font-size: 18px;
  }
}

// 过渡动画
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.process-panel__container {
  padding: 0;
  overflow-x: hidden;
  background-color: #fff;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px 0 0 4px;
  height: 100%;
  max-height: calc(100vh - 192px);

  // 自定义滚动条样式
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;

    &:hover {
      background: #a8a8a8;
    }
  }

  :deep(.el-collapse) {
    border: none;
  }

  :deep(.el-collapse-item__header) {
    background-color: #f5f7fa;
    padding-left: 16px;
    font-weight: 500;
    border-bottom: 1px solid #ebeef5;
  }

  :deep(.el-collapse-item__content) {
    padding: 16px;
    background-color: #ffffff;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: 1px solid #ebeef5;
  }
}
</style>
