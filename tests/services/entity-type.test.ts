import app from '../../packages/server/app'

describe('\'EntityType\' service', () => {
  it('registered the service', () => {
    const service = app.service('entity-type')
    expect(service).toBeTruthy()
  })
})
