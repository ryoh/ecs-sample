import { Stack, StackProps } from 'aws-cdk-lib';
//import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { Context } from '../utils/context';
import { LogBucket } from './log-bucket';
import { Network } from './network';
//import { RestApiGateway } from './apigateway';

interface InfrastructureStackProps extends StackProps {
  context: Context;
}

/**
 * Create VPC and LoadBalancer Resource
 */
export class InfrastructureStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly loadbalancer: elv2.NetworkLoadBalancer;
  //public readonly apigateway: apigw.RestApi;

  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    // VPC and VPCEndpoint
    const network = new Network(this, 'EcsNetwork');
    const vpc = network.vpc;
    this.vpc = vpc;

    // LoadBalancer
    const lb = new elv2.NetworkLoadBalancer(this, 'EcsLoadBalancer', {
      vpc,
      internetFacing: false,
    });
    // AccessLog
    const accessLogBucket = new LogBucket(this, 'EcsLoadBalancerAccessLog');
    lb.logAccessLogs(accessLogBucket.bucket);
    this.loadbalancer = lb;

    // Front RestAPI
    /*
    const api = new RestApiGateway(this, 'FrontAPI');
    this.apigateway = api.apigateway;
    */
  }
}
