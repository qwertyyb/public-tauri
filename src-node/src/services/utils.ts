
import * as robot from '@nut-tree-fork/nut-js';

const utils = {
  // 按下又抬起
  'keyboard.press': async (...keys: string[]) => {
    await robot.keyboard.type(...keys.map(key => robot.Key[key as keyof typeof robot.Key]))
  },
  'keyboard.down': async(...keys: string[]) => {
    await robot.keyboard.pressKey(...keys.map(key => robot.Key[key as keyof typeof robot.Key]))
  },
  'keyboard.up': async(...keys: string[]) => {
    await robot.keyboard.releaseKey(...keys.map(key => robot.Key[key as keyof typeof robot.Key]))
  },

  'mouse.getPosition': () => {
    return robot.mouse.getPosition()
  },
  'mouse.move': async (position: { x: number, y: number }) => {
    await robot.mouse.move(robot.straightTo(position));
  },
  'mouse.click': async (button: string) => {
    await robot.mouse.click(robot.Button[button as keyof typeof robot.Button])
  },
  'mouse.down': async (buttonOrButtons: string | string[]) => {
    const buttons = Array.isArray(buttonOrButtons) ? buttonOrButtons : [buttonOrButtons]
    await Promise.all(buttons.map(async button => {
      await robot.mouse.pressButton(robot.Button[button as keyof typeof robot.Button])
    }))
  },
  'mouse.up': async (buttonOrButtons: string | string[]) => {
    const buttons = Array.isArray(buttonOrButtons) ? buttonOrButtons : [buttonOrButtons]
    await Promise.all(buttons.map(async button => {
      await robot.mouse.releaseButton(robot.Button[button as keyof typeof robot.Button])
    }))
  },
  'mouse.scroll': async ({ x, y }: { x: number, y: number }) => {
    const ps: Promise<robot.MouseClass>[] =[]
    if (x > 0) {
      ps.push(robot.mouse.scrollRight(x))
    } else if (x < 0) {
      ps.push(robot.mouse.scrollLeft(-x))
    }
    if (y > 0) {
      ps.push(robot.mouse.scrollDown(y))
    } else if (y < 0) {
      ps.push(robot.mouse.scrollUp(-y))
    }
    await Promise.all(ps)
  },

  fetch: (...args: Parameters<typeof fetch>) => {
    return fetch(...args)
  }
}

export default utils
