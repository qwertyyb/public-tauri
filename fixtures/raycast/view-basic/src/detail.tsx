import os from 'node:os';
import { Action, ActionPanel, Detail, getPreferenceValues, showToast, Toast } from '@raycast/api';
import { useMemo, useState, useEffect } from 'react';

type Preferences = { message?: string };

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const platform = useMemo(() => os.platform(), []);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={[
        '# Worker-rendered Detail Command',
        '',
        preferences.message || '',
        '',
        `Platform: ${platform}`,
        `Count: ${count}`,
      ].join('\n')}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Platform" text={platform} />
          <Detail.Metadata.Label title="Count" text={String(count)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Reference" text="Raycast Detail Docs" target="https://developers.raycast.com/api-reference/user-interface/detail" />
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item text="detail" />
            <Detail.Metadata.TagList.Item text="metadata" />
            <Detail.Metadata.TagList.Item text="worker" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={(
        <ActionPanel>
          <Action
            title="Increment Count"
            onAction={() => {
              setCount(value => value + 1);
              void showToast({ style: Toast.Style.Success, title: 'Count incremented' });
            }}
          />
          <Action.CopyToClipboard title="Copy Platform" content={platform} />
        </ActionPanel>
      )}
    />
  );
}
