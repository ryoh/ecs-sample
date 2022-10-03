import { App, Stack, StackProps } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_pattern from 'aws-cdk-lib/aws-ecs-patterns';
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

    // ECS
    // Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
    });

    // Service
    const service = new ecs_pattern.NetworkLoadBalancedFargateService(this, 'Service', {
      cluster,
      memoryLimitMiB: 1024,
      cpu: 512,
      publicLoadBalancer: false,
      taskImageOptions: {
        image: ecs.EcrImage.fromEcrRepository(ecr.Repository.fromRepositoryName(this, 'AppRepo', 'hello-server')),
        containerName: 'app',
        containerPort: 3000,
        environment: {
          PORT: '3000',
        },
      },
      desiredCount: 1,
    });

    // API Gateway
    const restApi = new apigw.RestApi(this, 'APIGateway', {
      restApiName: 'HelloApi',
    });
    restApi.root.addProxy({
      defaultIntegration: new apigw.Integration({
        type: apigw.IntegrationType.HTTP_PROXY,
        options: {
          connectionType: apigw.ConnectionType.VPC_LINK,
          vpcLink: new apigw.VpcLink(this, 'VpcLink', {
            targets: [
              service.loadBalancer,
            ],
          }),
        },
      }),
    });
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
