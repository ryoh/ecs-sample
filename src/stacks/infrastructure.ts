import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // FlowLogs
    const logGroup = new logs.LogGroup(this, 'FlowLog');
    const role = new iam.Role(this, 'FlowLogRole', {
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });
    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'database',
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
  }
}
