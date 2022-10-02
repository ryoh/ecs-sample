import { App, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class EcsSample extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'isolate',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // VPC Endpoint (for ECS)
    vpc.addInterfaceEndpoint('EcrEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
    });
    vpc.addInterfaceEndpoint('EcrDkrEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });
    vpc.addInterfaceEndpoint('LogEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
    // optional 1 (for use SSM/Secrets)
    vpc.addInterfaceEndpoint('SSMInterface', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
    });
    vpc.addInterfaceEndpoint('SecretsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });
    // optional 2 (for application)
    vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // LoadBalancer
    const lb = new elv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: false,
    });
    // Listener
    const listener = lb.addListener('Listener', {
      port: 80,
    });

    // ECS
    // TaskDef
    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDef', {
      compatibility: ecs.Compatibility.FARGATE,
      memoryMiB: '512',
      cpu: '256',
    });
    const container = taskDefinition.addContainer('AppContainer', {
      image: ecs.EcrImage.fromEcrRepository(ecr.Repository.fromRepositoryName(this, 'HelloRepo', 'hello-server'), 'latest'),
    });
    container.addEnvironment('PORT', '3000');
    container.addPortMappings(
      {
        containerPort: 3000,
        protocol: ecs.Protocol.TCP,
      },
    );
    // Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,

    });
    // ECS
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      assignPublicIp: false,
      healthCheckGracePeriod: Duration.minutes(1),
    });
    service.registerLoadBalancerTargets(
      {
        containerName: container.containerName,
        containerPort: 3000,
        newTargetGroupId: 'ECS',
        listener: ecs.ListenerConfig.applicationListener(listener, {
          protocol: elv2.ApplicationProtocol.HTTP,
        }),
      },
    );
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new EcsSample(app, 'workspace-dev', { env: devEnv });
// new MyStack(app, 'workspace-prod', { env: prodEnv });

app.synth();
