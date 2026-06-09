import 'server-only';
import Docker from 'dockerode';

const globalRef = globalThis as unknown as { __backofficeDocker?: Docker };

export function resolveDockerHost(): { socketPath?: string; host?: string; port?: number } {
  const url = process.env['DOCKER_HOST'];
  if (url && url.length > 0) {
    if (url.startsWith('unix://')) {
      return { socketPath: url.replace('unix://', '') };
    }
    if (url.startsWith('npipe://')) {
      return { socketPath: url.replace('npipe://', '') };
    }
    const parsed = new URL(url);
    return { host: parsed.hostname, port: Number(parsed.port) || 2375 };
  }
  if (process.platform === 'win32') {
    return { socketPath: '//./pipe/docker_engine' };
  }
  return { socketPath: '/var/run/docker.sock' };
}

export function getDocker(): Docker {
  if (!globalRef.__backofficeDocker) {
    globalRef.__backofficeDocker = new Docker(resolveDockerHost());
  }
  return globalRef.__backofficeDocker;
}
