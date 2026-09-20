import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js"
import { ProgressCircle } from "@opencode-ai/ui/progress-circle"
import { ProgressCircleV2 } from "@opencode-ai/ui/v2/progress-circle-v2"
import { Button } from "@opencode-ai/ui/button"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { Popover } from "@opencode-ai/ui/popover"
import type { Part } from "@opencode-ai/sdk/v2/client"

import { useSync } from "@/context/sync"
import { useLanguage } from "@/context/language"
import { useProviders } from "@/hooks/use-providers"
import { useSDK } from "@/context/sdk"
import { getSessionContext } from "@/components/session/session-context-metrics"
import {
  estimateSessionContextBreakdown,
  type SessionContextBreakdownKey,
} from "@/components/session/session-context-breakdown"
import { useSessionLayout } from "@/pages/session/session-layout"

interface SessionContextUsageProps {
  variant?: "button" | "indicator"
  buttonAppearance?: "default" | "v2"
  class?: string
}

const BREAKDOWN_COLOR: Record<SessionContextBreakdownKey, string> = {
  system: "var(--syntax-info)",
  user: "var(--syntax-success)",
  assistant: "var(--syntax-property)",
  tool: "var(--syntax-warning)",
  other: "var(--syntax-comment)",
}

export function SessionContextUsage(props: SessionContextUsageProps) {
  const sync = useSync()
  const language = useLanguage()
  const sdk = useSDK()
  const providers = useProviders(() => sdk().directory)
  const { params, view } = useSessionLayout()

  const variant = createMemo(() => props.variant ?? "button")
  const buttonAppearance = createMemo(() => props.buttonAppearance ?? "default")
  const messages = createMemo(() => (params.id ? (sync().data.message[params.id] ?? []) : []))
  const [open, setOpen] = createSignal(false)
  let altClick = false

  const context = createMemo(() => getSessionContext(messages(), [...providers.all().values()]))
  const contextVisible = createMemo(() => view().reviewPanel.opened())

  const compact = createMemo(
    () => new Intl.NumberFormat(language.intl(), { notation: "compact", maximumFractionDigits: 1 }),
  )
  const compactTokens = (value: number | null | undefined) => (value == null ? "—" : `~${compact().format(value)}`)

  // 概览只在弹窗打开时估算，避免每次渲染都扫描全部消息。
  const breakdown = createMemo(() => {
    if (!open()) return undefined
    const current = context()
    if (!current?.contextInput) return undefined
    const systemPrompts = (() => {
      const list = messages()
      for (let i = list.length - 1; i >= 0; i--) {
        const message = list[i]
        if (message.role !== "user") continue
        if (!message.system?.trim()) continue
        return [message.system]
      }
      return []
    })()
    try {
      return estimateSessionContextBreakdown({
        messages: messages(),
        parts: sync().data.part as Record<string, Part[] | undefined>,
        input: current.contextInput,
        systemPrompts,
        boundaryMessageID: current.message.id,
      })
    } catch {
      return undefined
    }
  })
  const segments = createMemo(() => breakdown()?.segments ?? [])

  const breakdownLabel = (key: SessionContextBreakdownKey) => {
    if (key === "system") return language.t("context.breakdown.system")
    if (key === "user") return language.t("context.breakdown.user")
    if (key === "assistant") return language.t("context.breakdown.assistant")
    if (key === "tool") return language.t("context.breakdown.tool")
    return language.t("context.breakdown.other")
  }

  const openContext = () => {
    if (!params.id) return

    const sessionView = view()
    if (contextVisible()) {
      if (sessionView.reviewPanel.source() === "context-button") sessionView.reviewPanel.close()
      return
    }

    sessionView.reviewPanel.open("context-button")
  }

  // 按住 Option/Alt 点击打开详细侧栏，普通点击开概览弹窗。
  const onOpenChange = (next: boolean) => {
    if (altClick) {
      altClick = false
      setOpen(false)
      openContext()
      return
    }
    setOpen(next)
  }

  const circle = () => (
    <div class="flex items-center justify-center">
      <ProgressCircle
        size={16}
        strokeWidth={2}
        percentage={context()?.usage ?? 0}
        style={
          variant() === "indicator"
            ? {
                "--progress-circle-background": "var(--v2-background-bg-layer-04, var(--border-weak-base))",
                "--progress-circle-background-overlay": "var(--v2-overlay-simple-overlay-pressed, transparent)",
                "--progress-circle-progress": "var(--v2-icon-icon-base, var(--icon-base))",
              }
            : undefined
        }
      />
    </div>
  )
  const circleV2 = () => (
    <div class="flex items-center justify-center">
      <ProgressCircleV2 percentage={context()?.usage ?? 0} />
    </div>
  )

  const popoverContent = () => (
    <div class="flex w-[272px] flex-col gap-2.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-13-medium text-text-strong">
          {language.t("context.usage.popoverTitle", { percent: String(context()?.usage ?? 0) })}
        </span>
        <span class="text-12-regular text-text-weak tabular-nums">
          {compactTokens(context()?.total)} / {compactTokens(context()?.limit)}
        </span>
      </div>
      <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised-base">
        <For each={segments()}>
          {(segment) => <div style={{ width: `${segment.width}%`, background: BREAKDOWN_COLOR[segment.key] }} />}
        </For>
      </div>
      <div class="flex flex-col gap-1.5">
        <For each={segments()}>
          {(segment) => (
            <div class="flex items-center gap-2">
              <span class="size-2 shrink-0 rounded-[2px]" style={{ background: BREAKDOWN_COLOR[segment.key] }} />
              <span class="text-12-regular text-text-weak">{breakdownLabel(segment.key)}</span>
              <span class="ml-auto text-12-regular text-text-base tabular-nums">{compactTokens(segment.tokens)}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  )

  return (
    <Show when={params.id}>
      <Show when={variant() !== "indicator"} fallback={circle()}>
        <Switch>
            <Match when={buttonAppearance() === "v2"}>
              <Popover
                open={open()}
                onOpenChange={onOpenChange}
                triggerAs={IconButtonV2}
                triggerProps={{
                  type: "button",
                  variant: "ghost-muted",
                  size: "large",
                  icon: circleV2(),
                  "aria-label": language.t("context.usage.view"),
                  onPointerDown: (event: PointerEvent) => {
                    altClick = event.altKey
                  },
                }}
                placement="top"
                gutter={8}
              >
                {popoverContent()}
              </Popover>
            </Match>
            <Match when={true}>
              <Popover
                open={open()}
                onOpenChange={onOpenChange}
                triggerAs={Button}
                triggerProps={{
                  type: "button",
                  variant: "ghost",
                  class: props.class ?? "size-6 p-0",
                  "data-slot": "context-usage",
                  "aria-label": language.t("context.usage.view"),
                  onPointerDown: (event: PointerEvent) => {
                    altClick = event.altKey
                  },
                }}
                placement="top"
                gutter={8}
                trigger={circle()}
              >
                {popoverContent()}
              </Popover>
            </Match>
          </Switch>
      </Show>
    </Show>
  )
}
