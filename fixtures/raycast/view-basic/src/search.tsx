import os from 'node:os';
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from '@raycast/api';
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
          detail={
            <List.Item.Detail
              markdown={`# ${item.title}\n\n${preferences.message || ''}\n\nCount: ${count}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Title" text={item.title} />
                  <List.Item.Detail.Metadata.Label title="Subtitle" text={item.subtitle} />
                  <List.Item.Detail.Metadata.Label title="Count" text={count.toString()} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link title="Open in Browser" text="raycast" target="https://www.raycast.com" />
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    <List.Item.Detail.Metadata.TagList.Item text="Tag 1" />
                    <List.Item.Detail.Metadata.TagList.Item text="Tag 2" />
                    <List.Item.Detail.Metadata.TagList.Item text="Tag 3" />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
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
