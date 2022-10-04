import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EcsSample } from '../src/main';

test('Snapshot', () => {
  const devEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  };
  const app = new App();
  const stack = new EcsSample(app, 'test', { env: devEnv });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
