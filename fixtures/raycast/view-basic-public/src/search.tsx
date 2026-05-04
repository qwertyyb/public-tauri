import os from 'node:os';
import { Action, ActionPanel, Detail, getPreferenceValues, List, showToast, Toast } from '@raycast/api';
import { useMemo, useState } from 'react';

type Preferences = { message?: string };

const items = [
  { id: 'alpha', title: 'Alpha Result', subtitle: 'First Worker-rendered Raycast view result' },
  { id: 'beta', title: 'Beta Result', subtitle: 'Second Worker-rendered Raycast view result' },
];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [count, setCount] = useState(0);
  const platform = useMemo(() => os.platform(), []);

  return (
    <List searchBarPlaceholder="Search Worker-rendered Raycast view">
      {items.map(item => (
        <List.Item
          key={item.id}
          id={item.id}
          title={`${item.title} · ${platform} · ${count}`}
          subtitle={item.subtitle}
          detail={<Detail markdown={`# ${item.title}\n\n${preferences.message || ''}\n\nCount: ${count}`} />}
          actions={(
            <ActionPanel>
              <Action
                title="Increment Worker Count"
                onAction={() => {
                  setCount(value => value + 1);
                  void showToast({ style: Toast.Style.Success, title: `Incremented ${item.title}` });
                }}
              />
              <Action.CopyToClipboard title="Copy Title" content={item.title} />
            </ActionPanel>
          )}
        />
      ))}
    </List>
  );
}
