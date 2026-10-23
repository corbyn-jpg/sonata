// A stand-in for react-native-share in the browser, until the web versions of sharing and saving are built
// (docs/WEB_ROADMAP.md, phase 3). Callers already show an error when sharing fails.
type ShareOptions = {
  url: string;
  type?: string;
  title?: string;
  message?: string;
  subject?: string;
  failOnCancel?: boolean;
};

const Share = {
  async open(_options: ShareOptions): Promise<void> {
    throw new Error("Sharing from the browser isn't set up yet");
  },
};

export default Share;
