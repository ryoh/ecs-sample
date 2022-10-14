import { App, Stack, StackProps, Aspects } from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_pattern from 'aws-cdk-lib/aws-ecs-patterns';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { InfrastructureStack } from './infrastructure/infrastructure-stack';

export class EcsSample extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // FlowLogs
    const logGroup = new logs.LogGroup(this, 'FlowLog');
    const role = new iam.Role(this, 'FlowLogRole', {
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });
    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'isolate',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });
    vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, role),
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
    const lb = new elv2.NetworkLoadBalancer(this, 'EcsLoadBalancer', {
      vpc,
      internetFacing: false,
    });
    // AccessLog
    const accessLogBucket = new s3.Bucket(this, 'EcsLoadBalancerAccessLog', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
    NagSuppressions.addResourceSuppressions(accessLogBucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'NLBアクセスログ保存用バケットのため、これ自体のアクセスログは不要',
      },
    ]);
    lb.logAccessLogs(accessLogBucket);
    // SecurityGroup
    const lbsg = new ec2.SecurityGroup(this, 'EcsServiceSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });
    lbsg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'For Application Port');
    NagSuppressions.addResourceSuppressions(lbsg, [
      {
        id: 'AwsSolutions-EC23',
        reason: '内向けNLBのため、一旦全開放状態とする。可能であればAPIGatewayからのアクセスに絞ること',
      },
    ]);

    // ECS
    // Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
    });

    // Service
    const service = new ecs_pattern.NetworkLoadBalancedFargateService(this, 'Service', {
      cluster,
      memoryLimitMiB: 1024,
      cpu: 512,
      assignPublicIp: false,
      publicLoadBalancer: false,
      loadBalancer: lb,
      listenerPort: 80,
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
    NagSuppressions.addResourceSuppressionsByPath(this, '/workspace-dev/Service/TaskDef/Resource', [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'ポート番号は秘匿情報ではないため直接設定とする。',
      },
    ]);
    NagSuppressions.addResourceSuppressionsByPath(this, '/workspace-dev/Service/TaskDef/ExecutionRole/DefaultPolicy/Resource', [
      {
        id: 'AwsSolutions-IAM5',
        reason: '自動的に生成されるIAMロールの警告を無効化',
      },
    ]);

    // API Gateway
    const restApi = new apigw.RestApi(this, 'APIGateway', {
      restApiName: 'HelloApi',
    });
    const link = new apigw.VpcLink(this, 'VpcLink', {
      description: `Connects ${id} to ${id}/Gateway`,
      targets: [
        service.loadBalancer,
      ],
    });
    const integration = new apigw.Integration({
      integrationHttpMethod: 'ANY',
      type: apigw.IntegrationType.HTTP_PROXY,
      options: {
        connectionType: apigw.ConnectionType.VPC_LINK,
        vpcLink: link,
      },
      uri: `http://${service.loadBalancer.loadBalancerDnsName}/{proxy}`,
    });
    restApi.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

//new EcsSample(app, 'workspace-dev', { env: devEnv });
// new MyStack(app, 'workspace-prod', { env: prodEnv });

new InfrastructureStack(app, 'InfrastructureStack', { env: devEnv });

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

app.synth();
