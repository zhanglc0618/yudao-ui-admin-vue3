<template>
  <div class="panel-tab__content">
    <!-- 错误列表 -->
    <div class="panel-tab__content--title">
      <span><Icon icon="ep:warning" style="margin-right: 8px; color: #555" />错误列表</span>
      <XButton type="primary" title="创建新错误" preIcon="ep:plus" @click="openModel('error')" />
    </div>
    <el-table :data="errorList" border>
      <el-table-column type="index" label="序号" width="60px" />
      <el-table-column label="错误ID" prop="id" max-width="300px" show-overflow-tooltip />
      <el-table-column label="错误名称" prop="name" max-width="300px" show-overflow-tooltip />
      <el-table-column label="错误代码" prop="errorCode" max-width="300px" show-overflow-tooltip />
      <el-table-column label="操作" width="110px">
        <template #default="scope">
          <el-button link @click="openEditModel('error', scope.row, scope.$index)" size="small">
            编辑
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            link
            size="small"
            style="color: #ff4d4f"
            @click="removeObject('error', scope.row)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 升级列表 -->
    <div
      class="panel-tab__content--title"
      style="padding-top: 8px; margin-top: 8px; border-top: 1px solid #eee"
    >
      <span><Icon icon="ep:promotion" style="margin-right: 8px; color: #555" />升级列表</span>
      <XButton
        type="primary"
        title="创建新升级"
        preIcon="ep:plus"
        @click="openModel('escalation')"
      />
    </div>
    <el-table :data="escalationList" border>
      <el-table-column type="index" label="序号" width="60px" />
      <el-table-column label="升级ID" prop="id" max-width="300px" show-overflow-tooltip />
      <el-table-column label="升级名称" prop="name" max-width="300px" show-overflow-tooltip />
      <el-table-column
        label="升级代码"
        prop="escalationCode"
        max-width="300px"
        show-overflow-tooltip
      />
      <el-table-column label="操作" width="110px">
        <template #default="scope">
          <el-button
            link
            @click="openEditModel('escalation', scope.row, scope.$index)"
            size="small"
          >
            编辑
          </el-button>
          <el-divider direction="vertical" />
          <el-button
            link
            size="small"
            style="color: #ff4d4f"
            @click="removeObject('escalation', scope.row)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
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
        <el-form-item v-if="modelType === 'error'" label="错误代码">
          <el-input v-model="modelObjectForm.errorCode" clearable placeholder="可选" />
        </el-form-item>
        <el-form-item v-if="modelType === 'escalation'" label="升级代码">
          <el-input v-model="modelObjectForm.escalationCode" clearable placeholder="可选" />
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
defineOptions({ name: 'EscalationAndError' })

const message = useMessage()
const errorList = ref<any[]>([])
const escalationList = ref<any[]>([])
const dialogVisible = ref(false)
const modelType = ref('')
const modelObjectForm = ref<any>({})
const rootElements = ref()
const errorIdMap = ref()
const escalationIdMap = ref()
const editingIndex = ref(-1) // 正在编辑的索引，-1 表示新建

const modelConfig = computed(() => {
  const isEdit = editingIndex.value !== -1
  const configs = {
    error: {
      title: isEdit ? '编辑错误' : '创建错误',
      idLabel: '错误ID',
      nameLabel: '错误名称'
    },
    escalation: {
      title: isEdit ? '编辑升级' : '创建升级',
      idLabel: '升级ID',
      nameLabel: '升级名称'
    }
  }
  return configs[modelType.value] || configs.error
})

const bpmnInstances = () => (window as any)?.bpmnInstances

// 生成规范化的ID
const generateStandardId = (type: string): string => {
  const prefix = type === 'error' ? 'Error_' : 'Escalation_'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}_${random}`
}

const initDataList = () => {
  console.log(window, 'window')
  rootElements.value = bpmnInstances().modeler.getDefinitions().rootElements
  errorIdMap.value = {}
  escalationIdMap.value = {}
  errorList.value = []
  escalationList.value = []

  rootElements.value.forEach((el) => {
    if (el.$type === 'bpmn:Error') {
      errorIdMap.value[el.id] = true
      errorList.value.push({ ...el })
    }
    if (el.$type === 'bpmn:Escalation') {
      escalationIdMap.value[el.id] = true
      escalationList.value.push({ ...el })
    }
  })
}

const openModel = (type) => {
  modelType.value = type
  editingIndex.value = -1
  modelObjectForm.value = {
    id: generateStandardId(type),
    name: '',
    errorCode: type === 'error' ? '' : undefined,
    escalationCode: type === 'escalation' ? '' : undefined
  }
  dialogVisible.value = true
}

const openEditModel = (type, row, index) => {
  modelType.value = type
  editingIndex.value = index
  modelObjectForm.value = { ...row }
  dialogVisible.value = true
}

const addNewObject = () => {
  if (modelType.value === 'error') {
    // 编辑模式
    if (editingIndex.value !== -1) {
      const targetError = errorList.value[editingIndex.value]
      // 查找 rootElements 中的原始对象
      const rootError = rootElements.value.find(
        (el) => el.$type === 'bpmn:Error' && el.id === targetError.id
      )
      if (rootError) {
        rootError.id = modelObjectForm.value.id
        rootError.name = modelObjectForm.value.name
        rootError.errorCode = modelObjectForm.value.errorCode
      }
    } else {
      // 新建模式
      if (errorIdMap.value[modelObjectForm.value.id]) {
        message.error('该错误已存在，请修改id后重新保存')
        return
      }
      const newElement = bpmnInstances().moddle.create('bpmn:Error', modelObjectForm.value)
      rootElements.value.push(newElement)
    }
  } else {
    // 编辑模式
    if (editingIndex.value !== -1) {
      const targetEscalation = escalationList.value[editingIndex.value]
      // 查找 rootElements 中的原始对象
      const rootEscalation = rootElements.value.find(
        (el) => el.$type === 'bpmn:Escalation' && el.id === targetEscalation.id
      )
      if (rootEscalation) {
        rootEscalation.id = modelObjectForm.value.id
        rootEscalation.name = modelObjectForm.value.name
        rootEscalation.escalationCode = modelObjectForm.value.escalationCode
      }
    } else {
      // 新建模式
      if (escalationIdMap.value[modelObjectForm.value.id]) {
        message.error('该升级已存在，请修改id后重新保存')
        return
      }
      const newElement = bpmnInstances().moddle.create('bpmn:Escalation', modelObjectForm.value)
      rootElements.value.push(newElement)
    }
  }
  dialogVisible.value = false
  initDataList()
}

const removeObject = (type, row) => {
  ElMessageBox.confirm(`确认移除该${type === 'error' ? '错误' : '升级'}吗？`, '提示', {
    confirmButtonText: '确 认',
    cancelButtonText: '取 消'
  })
    .then(() => {
      // 从 rootElements 中移除
      const targetType = type === 'error' ? 'bpmn:Error' : 'bpmn:Escalation'
      const elementIndex = rootElements.value.findIndex(
        (el) => el.$type === targetType && el.id === row.id
      )
      if (elementIndex !== -1) {
        rootElements.value.splice(elementIndex, 1)
      }
      // 刷新列表
      initDataList()
      message.success('移除成功')
    })
    .catch(() => console.info('操作取消'))
}

onMounted(() => {
  initDataList()
})
</script>
