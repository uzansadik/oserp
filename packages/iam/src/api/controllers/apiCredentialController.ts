import type {
  IssueApiCredentialCommand,
  RotateApiCredentialCommand,
  RevokeApiCredentialCommand,
} from '../../application/commands/ApiCredentialCommands';
import type { IamContainer } from '../../container';
import type { ControllerResult } from '../types';

export function createApiCredentialController(container: IamContainer) {
  return {
    async issue(input: IssueApiCredentialCommand): Promise<ControllerResult> {
      const result = await container.commands.issueApiCredential.execute(input);
      return { statusCode: 201, body: result };
    },

    async rotate(input: RotateApiCredentialCommand): Promise<ControllerResult> {
      const result = await container.commands.rotateApiCredential.execute(input);
      return { statusCode: 200, body: result };
    },

    async revoke(input: RevokeApiCredentialCommand): Promise<ControllerResult> {
      await container.commands.revokeApiCredential.execute(input);
      return { statusCode: 204, body: null };
    },
  };
}
