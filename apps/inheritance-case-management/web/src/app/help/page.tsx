"use client"

import { Printer } from "lucide-react"
import { HELP_SECTIONS, type HelpBlock } from "./help-content"

function HelpBlockView({ block }: { block: HelpBlock }) {
    switch (block.kind) {
        case "paragraph":
            return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>
        case "list":
            return (
                <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-slate-700">
                    {block.items.map(item => <li key={item}>{item}</li>)}
                </ul>
            )
        case "steps":
            return (
                <ol className="ml-5 list-decimal space-y-1.5 text-sm leading-relaxed text-slate-700">
                    {block.items.map(item => <li key={item}>{item}</li>)}
                </ol>
            )
        case "table":
            return (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        {block.caption && <caption className="mb-1.5 text-left text-xs font-semibold text-slate-700">{block.caption}</caption>}
                        <thead>
                            <tr>
                                {block.headers.map(header => (
                                    <th key={header} scope="col" className="border border-slate-300 bg-slate-100 px-2.5 py-2 text-left align-top font-semibold text-slate-800">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map(row => (
                                <tr key={row.join("|")}>
                                    {row.map((cell, index) => (
                                        <td key={index} className="border border-slate-300 px-2.5 py-2 align-top leading-relaxed text-slate-700">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        case "note":
            return (
                <p className="help-note rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
                    <span className="font-semibold">注意　</span>{block.text}
                </p>
            )
    }
}

export default function HelpPage() {
    return (
        <div className="help-doc mx-auto max-w-5xl px-4 py-6 lg:py-10">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">操作説明書</h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">相続案件管理の使い方をまとめたものです。印刷すれば紙の手順書としても使えます。</p>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="help-print-button flex h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    印刷
                </button>
            </div>

            <div className="gap-8 lg:flex lg:items-start">
                <nav aria-labelledby="help-toc-heading" className="help-toc mb-6 rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:mb-0 lg:w-72 lg:shrink-0">
                    <h2 id="help-toc-heading" className="mb-3 text-sm font-semibold text-slate-800">目次</h2>
                    <ol className="space-y-2">
                        {HELP_SECTIONS.map(section => (
                            <li key={section.id}>
                                <a href={`#${section.id}`} className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                                    <span className="font-medium">{section.title}</span>
                                    <span className="mt-0.5 block text-xs text-slate-500">{section.summary}</span>
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="min-w-0 flex-1 space-y-6">
                    {HELP_SECTIONS.map(section => (
                        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="help-section scroll-mt-20 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                            <h2 id={`${section.id}-heading`} className="text-lg font-semibold text-slate-900">{section.title}</h2>
                            <p className="mt-1 text-xs text-slate-500">{section.summary}</p>
                            <div className="mt-4 space-y-3.5">
                                {section.blocks.map((block, index) => <HelpBlockView key={index} block={block} />)}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    )
}
