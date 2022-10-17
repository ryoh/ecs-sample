import { Environment } from 'aws-cdk-lib';
import { Node } from 'constructs';

export type StageType = 'dev';

interface ContextObjectInterface {
  env: EnvContext;
  vpcId: string;
  cidrBlock: string;
  maxAzs: number;
  backend: BackendContext;
}

export interface EnvContext extends Environment {
  account: string;
  region: string;
}

export interface BackendAppContext {
  name: string;
  repositoryName: string;
  containerName: string;
  containerPort: number;
  listenPort: number;
}

export interface BackendContext {
  backendapp: BackendAppContext[];
}

export class Context {
  private container: ContextObjectInterface;

  public stage: StageType;
  public project: string;
  public env: EnvContext;
  public vpcId: string;
  public cidrBlock: string;
  public maxAzs: number;
  public backend: BackendContext;

  constructor(stage: StageType, node: Node) {
    this.stage = stage;
    this.project = node.tryGetContext('project')! as string;
    this.container = node.tryGetContext(stage)! as ContextObjectInterface;

    this.env = this.container.env;
    this.vpcId = this.container.vpcId;
    this.cidrBlock = this.container.cidrBlock;
    this.maxAzs = this.container.maxAzs;
    this.backend = this.container.backend;
  }
}
