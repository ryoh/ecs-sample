import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { InfrastructureStack } from '../src/stacks/infrastructure';

test('Snapshot', () => {
  const devEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  };
  const app = new App();
  const stack = new InfrastructureStack(app, 'test', { env: devEnv });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
