export const generatePublicMain = () => `export default function createPlugin() {
  const getApi = () => window.$wujie?.props;
  return {
  async onAction(command, action, query, options) {
    const api = getApi();
    try {
      await api.channel.invoke('raycast:run', {
        commandName: command.name,
        query,
        action,
        options,
        preferences: api.getPreferences?.() || {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await api.dialog.showToast(message);
      throw error;
    }
  },
  };
}
`;
