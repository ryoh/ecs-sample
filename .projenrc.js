const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.46.0',
  cdkVersionPinning: true,
  defaultReleaseBranch: 'main',
  name: 'ecs-sample',
  devContainer: true,
  context: {
    project: 'ecs-sample',
    stage: 'dev',
    dev: {
      env: {
        account: '*************',
        region: 'ap-northeast-1',
      },
      vpcId: '',
      cidrBlock: '10.0.0.0/16',
      maxAzs: 2,
      backend: [
        {
          name: 'sampleapi',
          repogitoryName: 'sample',
          containerPort: 3000,
          containerName: 'app',
        },
      ],
    },
  },
  deps: ['cdk-nag'],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
