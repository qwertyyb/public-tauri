
import * as robot from '@nut-tree-fork/nut-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { runAppleScript } from 'run-applescript';
import { storage } from './sqlite';
import { hanziToPinyin } from '../lib/macos';

const execAsync = promisify(exec);

const labels = {
  CFBundleIdentifier: 'bundleIdentifier',
  CFBundleExecutablePath: 'executablePath',
  LSDisplayName: 'displayName',
};

interface Application {
  displayName: string
  executablePath: string
  bundleIdentifier: string
}

export const getFrontmostApplication = async (): Promise<Application | undefined | null> => {
  const { stdout } = await execAsync('lsappinfo visibleProcessList');
  const frontmost = await Promise.all(stdout.split(' ').slice(0, 1)
    .map(asn => execAsync(`lsappinfo info ${JSON.stringify(asn)} -only BundleID pid executablePath displayName`).then(({ stdout }) => {
      const lines = stdout.split('\n');
      const values = lines.reduce((acc, line) => {
        const [name, value] = line.split('=');
        if (!name) return acc;
        let label = name;
        try {
          label = labels[JSON.parse(name) as keyof typeof labels];
        } catch (err) {
          console.log(err);
        }
        if (label) {
          return {
            ...acc,
            [label]: JSON.parse(value!),
          };
        }
        return acc;
      }, {}) as Application;
      return values;
    })));
  return frontmost[0];
};

const utils = {
  'toPinyin': async (words: string) => {
    return hanziToPinyin(words)
  },

  // 按下又抬起
  'keyboard.press': async (...keys: string[]) => {
    await robot.keyboard.type(...keys.map(key => robot.Key[key as keyof typeof robot.Key]));
  },
  'keyboard.down': async (...keys: string[]) => {
    await robot.keyboard.pressKey(...keys.map(key => robot.Key[key as keyof typeof robot.Key]));
  },
  'keyboard.up': async (...keys: string[]) => {
    await robot.keyboard.releaseKey(...keys.map(key => robot.Key[key as keyof typeof robot.Key]));
  },

  'mouse.getPosition': () => robot.mouse.getPosition(),
  'mouse.move': async (position: { x: number, y: number }) => {
    await robot.mouse.move(robot.straightTo(position));
  },
  'mouse.click': async (button: string) => {
    await robot.mouse.click(robot.Button[button as keyof typeof robot.Button]);
  },
  'mouse.down': async (buttonOrButtons: string | string[]) => {
    const buttons = Array.isArray(buttonOrButtons) ? buttonOrButtons : [buttonOrButtons];
    await Promise.all(buttons.map(async (button) => {
      await robot.mouse.pressButton(robot.Button[button as keyof typeof robot.Button]);
    }));
  },
  'mouse.up': async (buttonOrButtons: string | string[]) => {
    const buttons = Array.isArray(buttonOrButtons) ? buttonOrButtons : [buttonOrButtons];
    await Promise.all(buttons.map(async (button) => {
      await robot.mouse.releaseButton(robot.Button[button as keyof typeof robot.Button]);
    }));
  },
  'mouse.scroll': async ({ x, y }: { x: number, y: number }) => {
    const ps: Promise<robot.MouseClass>[] = [];
    if (x > 0) {
      ps.push(robot.mouse.scrollRight(x));
    } else if (x < 0) {
      ps.push(robot.mouse.scrollLeft(-x));
    }
    if (y > 0) {
      ps.push(robot.mouse.scrollDown(y));
    } else if (y < 0) {
      ps.push(robot.mouse.scrollUp(-y));
    }
    await Promise.all(ps);
  },

  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),

  'system.getFrontmostApplication': () => getFrontmostApplication(),
  'system.getSelectedPath': async ({ fallbackCurrent = true } = {}) => {
    const script = `
    tell application "Finder"
      set selectedItems to selection
      if (count of selectedItems) is greater than 0 then
          set paths to ""
          repeat with anItem in selectedItems
              set paths to paths & POSIX path of (anItem as alias) & linefeed
          end repeat
      else
          ${fallbackCurrent ? 'set paths to POSIX path of (target of front Finder window as alias) & linefeed' : 'set paths to ""'}
      end if
    end tell
    return paths
    `;
    try {
      const result = await runAppleScript(script);
      return result.split('\n').map(i => i.trim())
        .filter(i => i);
    } catch (err) {
      return [];
    }
  },
  'system.getCurrentPath': async (): Promise<string | undefined | null> => {
    const script = `
    tell application "Finder"
      set paths to POSIX path of (target of front Finder window as alias) & linefeed
    end tell
    return paths
    `;
    try {
      const result = await runAppleScript(script);
      return result.split('\n').map(i => i.trim())
        .filter(i => i)[0];
    } catch (err) {
      return null;
    }
  },
  'system.runAppleScript': (script: string) => runAppleScript(script),
  'system.runCommand': (command: string) => new Promise((resolve, reject) => exec(command, { encoding: 'utf8' }, (error, stdout) => {
    if (error) {
      console.error(`exec error: ${error}`);
      reject(error);
      return;
    }
    resolve(stdout);
    return;
  })),

  'storage.getItem': (key: string) => storage.getItem(key),
  'storage.setItem': (key: string, value: string) => storage.setItem(key, value),
  'storage.allItems': (keyPrefix: string) => storage.allItems(keyPrefix),
  'storage.removeItem': (key: string) => storage.removeItem(key),
  'storage.clear': (keyPrefix: string) => storage.clear(keyPrefix),
};

export default utils;
