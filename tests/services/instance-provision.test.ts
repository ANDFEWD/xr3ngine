import app from '../../packages/server/app';

describe('\'instance-provision\' service', () => {
  it('registered the service', () => {
    const service = app.service('instance-provision');
    expect(service).toBeTruthy();
  });
});
