<template>
  <div class="panel-tab__content">
    <div class="panel-tab__content--title">
      <span><Icon icon="ep:menu" style="margin-right: 8px; color: #555" />消息列表</span>
      <XButton type="primary" title="创建新消息" preIcon="ep:plus" @click="openModel('message')" />
    </div>
    <el-table :data="messageList" border>
      <el-table-column type="index" label="序号" width="60px" />
      <el-table-column label="消息ID" prop="id" min-width="150px" show-overflow-tooltip />
      <el-table-column label="消息名称" prop="name" min-width="150px" show-overflow-tooltip />
      <el-table-column label="操作" width="80px" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            link
            size="small"
            @click="deleteObject('message', row)"
            title="删除消息"
          >
            <Icon icon="ep:delete" />
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div
      class="panel-tab__content--title"
      style="padding-top: 8px; margin-top: 8px; border-top: 1px solid #eee"
    >
      <span><Icon icon="ep:menu" style="margin-right: 8px; color: #555" />信号列表</span>
      <XButton type="primary" title="创建新信号" preIcon="ep:plus" @click="openModel('signal')" />
    </div>
    <el-table :data="signalList" border>
      <el-table-column type="index" label="序号" width="60px" />
      <el-table-column label="信号ID" prop="id" min-width="150px" show-overflow-tooltip />
      <el-table-column label="信号名称" prop="name" min-width="150px" show-overflow-tooltip />
      <el-table-column label="操作" width="80px" align="center">
        <template #default="{ row }">
          <el-button
            type="danger"
            link
            size="small"
            @click="deleteObject('signal', row)"
            title="删除信号"
          >
            <Icon icon="ep:delete" />
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="modelConfig.title"
      :close-on-click-modal="false"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="modelObjectForm" label-width="90px">
        <el-form-item :label="modelConfig.idLabel">
          <el-input v-model="modelObjectForm.id" clearable />
        </el-form-item>
        <el-form-item :label="modelConfig.nameLabel">
          <el-input v-model="modelObjectForm.name" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="addNewObject">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessageBox } from 'element-plus'

defineOptions({ name: 'SignalAndMassage' })

const message = useMessage()
const signalList = ref<any[]>([])
const messageList = ref<any[]>([])
const dialogVisible = ref(false)
const modelType = ref('')
const modelObjectForm = ref<any>({})
const rootElements = ref()
const messageIdMap = ref()
const signalIdMap = ref()
const modelConfig = computed(() => {
  if (modelType.value === 'message') {
    return { title: '创建消息', idLabel: '消息ID', nameLabel: '消息名称' }
  } else {
    return { title: '创建信号', idLabel: '信号ID', nameLabel: '信号名称' }
  }
})
const bpmnInstances = () => (window as any)?.bpmnInstances

const initDataList = () => {
  console.log(window, 'window')
  rootElements.value = bpmnInstances().modeler.getDefinitions().rootElements
  messageIdMap.value = {}
  signalIdMap.value = {}
  messageList.value = []
  signalList.value = []
  rootElements.value.forEach((el) => {
    if (el.$type === 'bpmn:Message') {
      messageIdMap.value[el.id] = true
      messageList.value.push({ ...el })
    }
    if (el.$type === 'bpmn:Signal') {
      signalIdMap.value[el.id] = true
      signalList.value.push({ ...el })
    }
  })
}
const openModel = (type) => {
  modelType.value = type
  modelObjectForm.value = {}
  dialogVisible.value = true
}
const addNewObject = () => {
  if (!modelObjectForm.value.id || !modelObjectForm.value.name) {
    message.error('请填写完整信息')
    return
  }

  if (modelType.value === 'message') {
    if (messageIdMap.value[modelObjectForm.value.id]) {
      message.error('该消息已存在，请修改id后重新保存')
      return
    }
    const messageRef = bpmnInstances().moddle.create('bpmn:Message', modelObjectForm.value)
    rootElements.value.push(messageRef)
    message.success('消息创建成功')
  } else {
    if (signalIdMap.value[modelObjectForm.value.id]) {
      message.error('该信号已存在，请修改id后重新保存')
      return
    }
    const signalRef = bpmnInstances().moddle.create('bpmn:Signal', modelObjectForm.value)
    rootElements.value.push(signalRef)
    message.success('信号创建成功')
  }
  dialogVisible.value = false
  initDataList()
}

const deleteObject = async (type, row) => {
  const typeName = type === 'message' ? '消息' : '信号'

  try {
    await ElMessageBox.confirm(
      `确定要删除${typeName}"${row.name}"吗？删除后无法恢复！`,
      `删除${typeName}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 检查是否有元素正在使用该消息/信号
    const isInUse = checkIfInUse(type, row.id)
    if (isInUse) {
      message.warning(`该${typeName}正在被使用中，建议先解除引用后再删除`)
      // 继续删除，但给出警告
    }

    // 从 rootElements 中删除
    const index = rootElements.value.findIndex(
      (el) => el.$type === (type === 'message' ? 'bpmn:Message' : 'bpmn:Signal') && el.id === row.id
    )

    if (index !== -1) {
      rootElements.value.splice(index, 1)
      message.success(`${typeName}删除成功`)
      initDataList()
    } else {
      message.error(`${typeName}删除失败，未找到对应的${typeName}`)
    }
  } catch (error) {
    // 用户取消删除
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      message.error(`${typeName}删除失败`)
    }
  }
}

// 检查消息/信号是否正在被使用
const checkIfInUse = (type, id) => {
  const refProperty = type === 'message' ? 'messageRef' : 'signalRef'

  // 遍历所有元素，检查是否有引用
  const allElements = bpmnInstances().elementRegistry.getAll()

  for (const element of allElements) {
    const businessObject = element.businessObject

    // 检查事件定义中的引用
    const eventDefinitions = businessObject?.eventDefinitions
    if (eventDefinitions && eventDefinitions.length > 0) {
      for (const eventDef of eventDefinitions) {
        if (eventDef[refProperty]?.id === id) {
          return true
        }
      }
    }

    // 检查直接引用（如 ReceiveTask 的 messageRef）
    if (businessObject?.[refProperty]?.id === id) {
      return true
    }
  }

  return false
}

onMounted(() => {
  initDataList()
})
</script>
