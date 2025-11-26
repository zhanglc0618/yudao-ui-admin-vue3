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
      <el-table-column label="操作" width="80px" align="center">
        <template #default="{ $index }">
          <el-button
            type="danger"
            size="small"
            link
            @click="deleteObject('error', $index)"
            title="删除"
          >
            <Icon icon="ep:delete" />
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
      <el-table-column label="操作" width="80px" align="center">
        <template #default="{ $index }">
          <el-button
            type="danger"
            size="small"
            link
            @click="deleteObject('escalation', $index)"
            title="删除"
          >
            <Icon icon="ep:delete" />
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

const modelConfig = computed(() => {
  const configs = {
    error: { title: '创建错误', idLabel: '错误ID', nameLabel: '错误名称' },
    escalation: { title: '创建升级', idLabel: '升级ID', nameLabel: '升级名称' }
  }
  return configs[modelType.value] || configs.error
})

const bpmnInstances = () => (window as any)?.bpmnInstances

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
  modelObjectForm.value = {}
  dialogVisible.value = true
}

const addNewObject = () => {
  const typeConfigs = {
    error: {
      idMap: errorIdMap.value,
      type: 'bpmn:Error',
      errorMsg: '该错误已存在，请修改id后重新保存'
    },
    escalation: {
      idMap: escalationIdMap.value,
      type: 'bpmn:Escalation',
      errorMsg: '该升级已存在，请修改id后重新保存'
    }
  }

  const config = typeConfigs[modelType.value]
  if (!config) return

  if (config.idMap[modelObjectForm.value.id]) {
    message.error(config.errorMsg)
    return
  }

  const newElement = bpmnInstances().moddle.create(config.type, modelObjectForm.value)
  rootElements.value.push(newElement)

  dialogVisible.value = false
  initDataList()
}

const deleteObject = (type: string, index: number) => {
  const listMap = {
    error: errorList.value,
    escalation: escalationList.value
  }

  const typeMap = {
    error: 'bpmn:Error',
    escalation: 'bpmn:Escalation'
  }

  const list = listMap[type]
  const bpmnType = typeMap[type]

  if (!list || !bpmnType) return

  const item = list[index]
  if (!item) return

  // 从 rootElements 中删除
  const elementIndex = rootElements.value.findIndex(
    (el) => el.$type === bpmnType && el.id === item.id
  )

  if (elementIndex > -1) {
    rootElements.value.splice(elementIndex, 1)
    initDataList()
  }
}

onMounted(() => {
  initDataList()
})
</script>
