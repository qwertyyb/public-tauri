import { definePlugin, dialog, clipboard, utils } from '@public/api';

/**
 * Simple Plugin Template
 * 
 * This template shows the basic structure for a simple command plugin.
 * Modify this to implement your plugin logic.
 */

const createMyPlugin = definePlugin(() => ({
  /**
   * Called when user types in the search input
   * Return array of items to show in results
   */
  onInput(keyword: string) {
    // Validate input
    if (!keyword || keyword.trim().length === 0) {
      return;
    }

    // TODO: Implement your input processing logic
    const isValid = true;
    
    if (isValid) {
      // TODO: Generate results based on your logic
      return [
        {
          name: 'my-command',
          title: `Result for: ${keyword}`,
          subtitle: 'Click to execute',
          icon: './assets/icon.png',
          text: keyword, // Custom data you can use in onEnter
        },
      ];
    }
  },

  /**
   * Called when user presses Enter on a command
   */
  onEnter(command, query) {
    // TODO: Implement your command execution logic
    dialog.showToast(`Executing: ${command.title}`);
    
    // Example: Copy to clipboard
    if (command.text) {
      clipboard.write(command.text);
      dialog.showToast('Copied to clipboard!');
    }

    // Example: Run system command
    // utils.runCommand(`echo "${query}"`);
    
    // Example: Run AppleScript
    // utils.runAppleScript(`display notification "${query}"`);
  },
}));

export default createMyPlugin;
