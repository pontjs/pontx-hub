import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "~/lib/catalog/types";
import { trackAnalyticsEvent } from "~/components/google-analytics";

const GITHUB_REPOSITORY_URL = "https://github.com/pontjs/pontx-hub";
const ISSUE_TEMPLATE = "website-bug.yml";
const DISCUSSION_CATEGORY = "ideas";

const copy = {
  zh: {
    label: "反馈",
    title: "帮助我们改进 Pontx Hub",
    description: "选择最合适的公开反馈渠道，我们会在 3 个工作日内完成确认和分流。",
    close: "关闭反馈窗口",
    issueEyebrow: "网站问题",
    issueTitle: "报告网站问题",
    issueDescription: "页面无法使用、交互异常、显示错误或无障碍问题。",
    issueAction: "填写 Bug 报告",
    ideaEyebrow: "功能建议",
    ideaTitle: "提出改进建议",
    ideaDescription: "分享你希望新增、调整或简化的网站体验。",
    ideaAction: "发起公开讨论",
    noticeTitle: "反馈会公开发布到 GitHub",
    notice: "需要 GitHub 登录。请勿提交 API Key、Token、密码、个人信息或其他敏感数据。"
  },
  en: {
    label: "Feedback",
    title: "Help improve Pontx Hub",
    description: "Choose the right public channel. We will acknowledge and triage feedback within three business days.",
    close: "Close feedback dialog",
    issueEyebrow: "Website problem",
    issueTitle: "Report a website problem",
    issueDescription: "Broken pages, interaction failures, visual defects, or accessibility problems.",
    issueAction: "Complete a bug report",
    ideaEyebrow: "Product idea",
    ideaTitle: "Suggest an improvement",
    ideaDescription: "Share something the website should add, change, simplify, or explain better.",
    ideaAction: "Start a public discussion",
    noticeTitle: "Feedback is published publicly on GitHub",
    notice: "A GitHub account is required. Do not include API keys, tokens, passwords, personal information, or other sensitive data."
  }
} satisfies Record<Locale, Record<string, string>>;

export type FeedbackChannel = "issue" | "discussion";

export function sanitizeFeedbackPath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0]?.trim() ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.length > 1_024) return "/";
  return pathOnly;
}

function feedbackUrl(
  destination: "issues/new" | "discussions/new",
  locale: Locale,
  pathname: string
): URL {
  const url = new URL(`${GITHUB_REPOSITORY_URL}/${destination}`);
  url.searchParams.set("page_path", sanitizeFeedbackPath(pathname));
  url.searchParams.set("locale", locale);
  return url;
}

export function websiteIssueUrl(locale: Locale, pathname: string): string {
  const url = feedbackUrl("issues/new", locale, pathname);
  url.searchParams.set("template", ISSUE_TEMPLATE);
  return url.toString();
}

export function featureDiscussionUrl(locale: Locale, pathname: string): string {
  const url = feedbackUrl("discussions/new", locale, pathname);
  url.searchParams.set("category", DISCUSSION_CATEGORY);
  return url.toString();
}

export function feedbackAnalyticsParameters(
  locale: Locale,
  channel?: FeedbackChannel
) {
  return {
    locale,
    surface: "site_header",
    ...(channel ? { channel } : {})
  } as const;
}

export function trackFeedbackChannel(locale: Locale, channel: FeedbackChannel) {
  trackAnalyticsEvent(
    "feedback_channel_select",
    feedbackAnalyticsParameters(locale, channel)
  );
}

function IssueIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

function IdeaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.25 17h5.5" />
      <path d="M10 20h4" />
      <path d="M8.45 14.6a6 6 0 1 1 7.1 0c-.72.55-1.08 1.15-1.08 1.8H9.53c0-.65-.36-1.25-1.08-1.8Z" />
      <path d="M12 2V.75M4.3 5.2l-.9-.9M19.7 5.2l.9-.9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 15 15 5M7 5h8v8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

export function FeedbackDialogPanel({
  locale,
  pathname,
  onClose
}: {
  locale: Locale;
  pathname: string;
  onClose: () => void;
}) {
  const text = copy[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const choose = (channel: FeedbackChannel) => {
    trackFeedbackChannel(locale, channel);
    onClose();
  };

  return (
    <dialog
      id="site-feedback-dialog"
      ref={dialogRef}
      className="feedback-dialog"
      aria-labelledby="site-feedback-title"
      aria-describedby="site-feedback-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="feedback-dialog-panel">
        <header className="feedback-dialog-header">
          <div>
            <p className="feedback-dialog-kicker">PONTX / {text.label.toUpperCase()}</p>
            <h2 id="site-feedback-title">{text.title}</h2>
            <p id="site-feedback-description">{text.description}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="site-control feedback-dialog-close"
            aria-label={text.close}
            title={text.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="feedback-dialog-options">
          <a
            className="feedback-dialog-option feedback-dialog-option-issue"
            href={websiteIssueUrl(locale, pathname)}
            target="_blank"
            rel="noreferrer"
            onClick={() => choose("issue")}
          >
            <span className="feedback-dialog-option-icon"><IssueIcon /></span>
            <span className="feedback-dialog-option-copy">
              <small>{text.issueEyebrow}</small>
              <strong>{text.issueTitle}</strong>
              <span>{text.issueDescription}</span>
            </span>
            <span className="feedback-dialog-option-action">
              {text.issueAction}
              <ArrowIcon />
            </span>
          </a>
          <a
            className="feedback-dialog-option feedback-dialog-option-idea"
            href={featureDiscussionUrl(locale, pathname)}
            target="_blank"
            rel="noreferrer"
            onClick={() => choose("discussion")}
          >
            <span className="feedback-dialog-option-icon"><IdeaIcon /></span>
            <span className="feedback-dialog-option-copy">
              <small>{text.ideaEyebrow}</small>
              <strong>{text.ideaTitle}</strong>
              <span>{text.ideaDescription}</span>
            </span>
            <span className="feedback-dialog-option-action">
              {text.ideaAction}
              <ArrowIcon />
            </span>
          </a>
        </div>

        <aside className="feedback-dialog-notice" role="note">
          <span aria-hidden="true">PUBLIC</span>
          <div>
            <strong>{text.noticeTitle}</strong>
            <p>{text.notice}</p>
          </div>
        </aside>
      </div>
    </dialog>
  );
}

export function FeedbackDialog({
  open,
  locale,
  pathname,
  returnFocusRef,
  onClose
}: {
  open: boolean;
  locale: Locale;
  pathname: string;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (open) return;
    returnFocusRef.current?.focus();
  }, [open, returnFocusRef]);

  if (!hydrated || !open) return null;
  return createPortal(
    <FeedbackDialogPanel locale={locale} pathname={pathname} onClose={onClose} />,
    document.body
  );
}
