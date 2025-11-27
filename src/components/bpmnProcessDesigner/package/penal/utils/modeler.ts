export const getBpmnModeler = () => (window as any)?.bpmnInstances?.modeler

export const emitCommandStackChanged = (reason = 'penal.custom-change') => {
  const modeler = getBpmnModeler()
  const eventBus = modeler?.get?.('eventBus') ?? modeler?.get('eventBus')
  eventBus?.fire('commandStack.changed', { reason })
}
