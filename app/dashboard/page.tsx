"use client"

import { useRepurpose } from "@/hooks/use-repurpose"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { UsageLimitBanner } from "@/components/dashboard/UsageLimitBanner"
import { InputSection } from "@/components/dashboard/InputSection"
import { ResultsSection } from "@/components/dashboard/ResultsSection"

export default function NewRepurposePage() {
    const {
        user,
        tab,
        setTab,
        inputText,
        setInputText,
        url,
        setUrl,
        readerContext,
        setReaderContext,
        angle,
        setAngle,
        emojiOn,
        setEmojiOn,
        tonePreset,
        setTonePreset,
        formats,
        toggleFormat,
        loading,
        cooldown,
        results,
        setResults,
        plan,
        usageCount,
        usageLimitMonthly,
        responseHooks,
        regeneratingFormat,
        editingFormats,
        toggleEdit,
        canGenerate,
        isLimitReached,
        handleGenerate,
        handleRegenerate,
        handleSwapHook,
        handleCopy
    } = useRepurpose()

    return (
        <div className="space-y-8 text-stone-900 pb-12">
            <UsageLimitBanner
                isLimitReached={isLimitReached}
                usageCount={usageCount}
                usageLimitMonthly={usageLimitMonthly}
            />

            <DashboardHeader cooldown={cooldown} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <InputSection
                    plan={plan}
                    tab={tab}
                    setTab={setTab}
                    inputText={inputText}
                    setInputText={setInputText}
                    url={url}
                    setUrl={setUrl}
                    readerContext={readerContext}
                    setReaderContext={setReaderContext}
                    angle={angle}
                    setAngle={setAngle}
                    emojiOn={emojiOn}
                    setEmojiOn={setEmojiOn}
                    tonePreset={tonePreset}
                    setTonePreset={setTonePreset}
                    formats={formats}
                    toggleFormat={toggleFormat}
                    handleGenerate={handleGenerate}
                    canGenerate={canGenerate}
                    loading={loading}
                    cooldown={cooldown}
                    isLimitReached={isLimitReached}
                />

                <ResultsSection
                    results={results}
                    formats={formats}
                    loading={loading}
                    regeneratingFormat={regeneratingFormat}
                    plan={plan}
                    editingFormats={editingFormats}
                    toggleEdit={toggleEdit}
                    handleRegenerate={handleRegenerate}
                    handleSwapHook={handleSwapHook}
                    handleCopy={handleCopy}
                    responseHooks={responseHooks}
                    setResults={setResults}
                    user={user}
                />
            </div>
        </div>
    )
}
