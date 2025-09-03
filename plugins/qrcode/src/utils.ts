import { utils } from '@public/api';

export const getChromeCurrentUrl = async () => {
  const script = `
  tell application "Google Chrome"
    if (count of windows) > 0 then
      set currentTab to active tab of front window
      set currentURL to URL of currentTab
      return currentURL
    else
      return ""
    end if
  end tell
  `;
  try {
    return await utils.runAppleScript(script);
  } catch (err) {
    return '';
  }
};

export const getSafariCurrentUrl = async () => {
  const script = `
    tell application "Safari"
      if (count of windows) > 0 then
          set currentTab to current tab of front window
          set currentURL to URL of currentTab
          return currentURL
      else
          return ""
      end if
    end tell
  `;

  try {
    return await utils.runAppleScript(script);
  } catch (err) {
    return '';
  }
};
