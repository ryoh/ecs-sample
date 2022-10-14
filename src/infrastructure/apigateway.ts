import * as apigw from 'aws-cdk-lib/aws-apigateway';
//import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * API Gateway
 */
export class RestApiGateway extends Construct {
  public readonly apigateway: apigw.RestApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Access Log
    //const accessLogGroup = new logs.LogGroup(this, 'RestApiAccessLog');

    // front API Gateway
    const restapi = new apigw.RestApi(this, 'RestApi', {
      restApiName: `${id}-RestApi`,
      cloudWatchRole: true,
      deploy: false,
      defaultMethodOptions: {
        authorizationType: apigw.AuthorizationType.NONE,
      },
    });

    // Request Validator
    restapi.addRequestValidator('RequestValidator', {
      requestValidatorName: 'BaseRequestValidator',
      validateRequestBody: false,
      validateRequestParameters: false,
    });

    // Default Method
    restapi.root.addMethod('ANY');

    this.apigateway = restapi;
  }
}
