import { showToast, Toast } from './raycast';
import { utils } from './node';

export const runAppleScript = (script: string) => utils.runAppleScript(script);

export const showFailureToast = async (error: unknown, options: { title?: string } = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  await showToast({
    style: Toast.Style.Failure,
    title: options.title || 'Something went wrong',
    message,
  });
};
