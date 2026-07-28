export const LINE_RICH_MENU_SIZE = { width: 2500, height: 1686 } as const;

type Environment = Record<string, string | undefined>;

export type LineRichMenuAction =
  | { type: "message"; label: string; text: string }
  | { type: "uri"; label: string; uri: string };

export type LineRichMenuPayload = {
  size: typeof LINE_RICH_MENU_SIZE;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: Array<{
    bounds: { x: number; y: number; width: number; height: number };
    action: LineRichMenuAction;
  }>;
};

function productionUrl(value: string | undefined, label: string) {
  const raw = value?.trim();
  if (!raw) throw new Error(`${label} 未設定`);
  if (/[{}]/.test(raw)) {
    throw new Error(`${label} 不可包含未替換的動態 placeholder；LINE Rich Menu URI 不會替換 {lineToken}`);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} 必須是完整 HTTPS URL`);
  }

  if (url.protocol !== "https:") throw new Error(`${label} 必須使用 HTTPS`);
  if (url.username || url.password) throw new Error(`${label} 不可包含帳號密碼`);
  return url;
}

function liffUrl(liffId: string | undefined, view?: "my-bookings") {
  const value = liffId?.trim();
  if (!value || !/^\d+-[A-Za-z0-9]+$/.test(value)) throw new Error("NEXT_PUBLIC_LINE_LIFF_ID 未設定或格式不正確");
  const url = new URL(`https://liff.line.me/${value}`);
  if (view) url.searchParams.set("view", view);
  return url.toString();
}

export function resolveLineRichMenuUrls(env: Environment) {
  return {
    shuttle: productionUrl(liffUrl(env.NEXT_PUBLIC_LINE_LIFF_ID), "LIFF 員工車入口").toString(),
    myShuttle: productionUrl(liffUrl(env.NEXT_PUBLIC_LINE_LIFF_ID, "my-bookings"), "LIFF 我的員工車報名").toString(),
  };
}

export function buildLineRichMenu(env: Environment): LineRichMenuPayload {
  const urls = resolveLineRichMenuUrls(env);
  const cellWidth = 1250;
  const cellHeight = 843;

  const actions: LineRichMenuAction[] = [
    { type: "message", label: "工程／IT 報修", text: "我要報修" },
    { type: "uri", label: "員工車登記", uri: urls.shuttle },
    { type: "message", label: "我的報修", text: "我的報修" },
    { type: "uri", label: "我的員工車報名", uri: urls.myShuttle },
  ];

  return {
    size: LINE_RICH_MENU_SIZE,
    selected: true,
    name: "太魯閣員工服務台｜四大服務",
    chatBarText: "員工服務台",
    areas: actions.map((action, index) => ({
      bounds: {
        x: (index % 2) * cellWidth,
        y: Math.floor(index / 2) * cellHeight,
        width: cellWidth,
        height: cellHeight,
      },
      action,
    })),
  };
}
