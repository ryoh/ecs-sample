const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.44.0',
  cdkVersionPinning: true,
  defaultReleaseBranch: 'main',
  name: 'ecs-sample',
  devContainer: true,
  context: {
    ['target']: 'dev',
    ['dev']: {
      ['region']: 'ap-northeast-1',
      ['cidr']: '10.0.0.0/16',
      ['ecs']: {
        ['containerPort']: '3000',
        ['containerName']: 'app',
        ['ecrRepoName']: 'hello-server',
      },
    },
    ['stg']: {
      ['region']: 'ap-northeast-1',
      ['cidr']: '10.0.0.0/16',
      ['ecs']: {
        ['containerPort']: '3000',
        ['containerName']: 'app',
        ['ecrRepoName']: 'hello-server',
      },
    },
    ['prod']: {
      ['region']: 'ap-northeast-1',
      ['cidr']: '10.0.0.0/16',
      ['ecs']: {
        ['containerPort']: '3000',
        ['containerName']: 'app',
        ['ecrRepoName']: 'hello-server',
      },
    },
  },
  deps: ['cdk-nag'],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
