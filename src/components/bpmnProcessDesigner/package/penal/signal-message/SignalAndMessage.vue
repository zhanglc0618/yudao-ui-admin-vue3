<template>
  <div class="panel-tab__content">
    <div class="panel-tab__content--title">
      <span><Icon icon="ep:menu" style="margin-right: 8px; color: #555" />消息列表</span>
      <XButton type="primary" title="创建新消息" preIcon="ep:plus" @click="openModel('message')" />
    </div>
    <el-table :data="messageList" border>
      <el-table-column type="index" label="序号" width="60px" />
      <el-table-column label="消息ID" prop="id" min-width="120px" show-overflow-tooltip />
      <el-table-column label="消息名称" prop="name" min-width="120px" show-overflow-tooltip />
      <el-table-column label="操作" width="110px">
        <!-- 补充“编辑”、“移除”功能。相关 issue：https://github.com/YunaiV/yudao-cloud/issues/270 -->
        <template #default="scope">
          <el-button link @click="openEditModel('message', scope.row, scope.$index)" size="small">
            编辑
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            link
            size="small"
            style="color: #ff4d4f"
            @click="removeObject('message', scope.row)"
          >
            移除
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
      <el-table-column label="信号ID" prop="id" min-width="120px" show-overflow-tooltip />
      <el-table-column label="信号名称" prop="name" min-width="120px" show-overflow-tooltip />
      <el-table-column label="操作" width="110px">
        <template #default="scope">
          <el-button link @click="openEditModel('signal', scope.row, scope.$index)" size="small">
            编辑
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            link
            size="small"
            style="color: #ff4d4f"
            @click="removeObject('signal', scope.row)"
          >
            移除
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
import { emitCommandStackChanged, getBpmnModeler } from '../utils/modeler'
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
const editingIndex = ref(-1) // 正在编辑的索引，-1 表示新建
const modelConfig = computed(() => {
  const isEdit = editingIndex.value !== -1
  if (modelType.value === 'message') {
    return {
      title: isEdit ? '编辑消息' : '创建消息',
      idLabel: '消息ID',
      nameLabel: '消息名称'
    }
  } else {
    return {
      title: isEdit ? '编辑信号' : '创建信号',
      idLabel: '信号ID',
      nameLabel: '信号名称'
    }
  }
})
const bpmnInstances = () => (window as any)?.bpmnInstances

// 生成规范化的ID
const generateStandardId = (type: string): string => {
  const prefix = type === 'message' ? 'Message_' : 'Signal_'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}_${random}`
}

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
  editingIndex.value = -1
  modelObjectForm.value = {
    id: generateStandardId(type),
    name: ''
  }
  dialogVisible.value = true
}

const openEditModel = (type, row, index) => {
  modelType.value = type
  editingIndex.value = index
  modelObjectForm.value = { ...row }
  dialogVisible.value = true
}
const replaceRootElement = (typeKey: 'message' | 'signal', originalId: string, payload: any) => {
  const modeler = getBpmnModeler()
  if (!modeler) return
  const moddle = modeler.get('moddle')
  const modeling = modeler.get('modeling')
  const definitions = modeler.getDefinitions()
  const targetType = typeKey === 'message' ? 'bpmn:Message' : 'bpmn:Signal'
  const entries = definitions.rootElements.filter((el) => el.$type === targetType)
  const target = entries.find((el) => el.id === originalId)
  if (target) {
    modeling.updateModdleProperties({ businessObject: target }, target, payload)
  } else {
    const newElement = moddle.create(targetType, payload)
    definitions.rootElements.push(newElement)
  }
}

const deleteRootElement = (typeKey: 'message' | 'signal', id: string) => {
  const modeler = getBpmnModeler()
  if (!modeler) return
  const modeling = modeler.get('modeling')
  const definitions = modeler.getDefinitions()
  const targetType = typeKey === 'message' ? 'bpmn:Message' : 'bpmn:Signal'
  const target = definitions.rootElements.find((el) => el.$type === targetType && el.id === id)
  if (target) {
    modeling.updateModdleProperties({ businessObject: definitions }, definitions, {
      rootElements: definitions.rootElements.filter((el) => el !== target)
    })
  }
}

const addNewObject = () => {
  if (modelType.value === 'message') {
    if (editingIndex.value !== -1) {
      replaceRootElement('message', messageList.value[editingIndex.value].id, {
        id: modelObjectForm.value.id,
        name: modelObjectForm.value.name
      })
    } else {
      if (messageIdMap.value[modelObjectForm.value.id]) {
        message.error('该消息已存在，请修改id后重新保存')
        return
      }
      replaceRootElement('message', modelObjectForm.value.id, { ...modelObjectForm.value })
    }
  } else {
    if (editingIndex.value !== -1) {
      replaceRootElement('signal', signalList.value[editingIndex.value].id, {
        id: modelObjectForm.value.id,
        name: modelObjectForm.value.name
      })
    } else {
      if (signalIdMap.value[modelObjectForm.value.id]) {
        message.error('该信号已存在，请修改id后重新保存')
        return
      }
      replaceRootElement('signal', modelObjectForm.value.id, { ...modelObjectForm.value })
    }
  }
  dialogVisible.value = false
  initDataList()
  emitCommandStackChanged('signal-message.update')
}

const removeObject = (type, row) => {
  ElMessageBox.confirm(`确认移除该${type === 'message' ? '消息' : '信号'}吗？`, '提示', {
    confirmButtonText: '确 认',
    cancelButtonText: '取 消'
  })
    .then(() => {
      deleteRootElement(type, row.id)
      initDataList()
      message.success('移除成功')
      emitCommandStackChanged('signal-message.remove')
    })
    .catch(() => console.info('操作取消'))
}

onMounted(() => {
  initDataList()
})
</script>
