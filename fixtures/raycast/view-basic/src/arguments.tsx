import { Detail, type LaunchProps } from '@raycast/api';

type CommandArguments = {
  title: string;
  secret: string;
  favoriteColor: string;
};

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { title, secret, favoriteColor } = props.arguments;
  const hasSecret = secret.trim().length > 0 ? 'yes' : 'no';
  return (
    <Detail
      markdown={[
        '# Arguments command loaded',
        '',
        `Title: ${title}`,
        `Favorite Color: ${favoriteColor}`,
        `Has Secret: ${hasSecret}`,
      ].join('\n')}
    />
  );
}
