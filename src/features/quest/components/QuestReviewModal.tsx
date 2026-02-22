/**
 * QuestReviewModal Component
 * Modal for reviewing quest (副本) completion
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { Modal, Button, Textarea } from '../../../components/ui';
import { generateQuestCompletionSummary } from '../../../services/reflection-service';
import type { MainQuest, CustomTask } from '../../../types/task';
import { useTranslation } from '../../../lib/i18n/useTranslation';

interface QuestReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (review: QuestReviewData) => void;
    quest: MainQuest | null;
    linkedTasks?: CustomTask[];
}

export interface QuestReviewData {
    questId: string;
    review: string;
    satisfaction: number;
    whatWentWell?: string;
    whatCouldImprove?: string;
}

type ModalPhase = 'review' | 'analyzing' | 'result';

interface AnalysisResult {
    summary: string;
    keyAchievements?: string[];
    lessonsLearned?: string[];
    affirmation?: string;
}

const ReviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const QuestInfo = styled.div`
  background: ${({ theme }) => theme.colors.card.purple.bg};
  border: 1px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 10px;
  padding: 16px;
`;

const QuestTitle = styled.h4`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const QuestMeta = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const MetricGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MetricLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SatisfactionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SatisfactionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SatisfactionButton = styled.button<{ $selected: boolean }>`
  flex: 1;
  padding: 12px 8px;
  border: 2px solid ${({ $selected, theme }) =>
        $selected ? theme.colors.accent.purple : theme.colors.border.secondary};
  border-radius: 10px;
  background: ${({ $selected, theme }) =>
        $selected ? theme.colors.card.purple.bg : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.purple};
    background: ${({ theme }) => theme.colors.card.purple.bg};
  }

  span:first-child {
    font-size: 1.5rem;
  }

  span:last-child {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
`;

// Analyzing phase styles
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const AnalyzingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
`;

const AnalyzingIcon = styled.div`
  font-size: 3rem;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const AnalyzingText = styled.div`
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 300px;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: linear-gradient(90deg, #8b5cf6, #3b82f6);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

// Result phase styles
const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ResultSection = styled.div`
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 10px;
  padding: 16px;
`;

const ResultTitle = styled.h4`
  margin: 0 0 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResultText = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
`;

const ResultList = styled.ul`
  margin: 0;
  padding-left: 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  line-height: 1.8;
`;

const AffirmationBox = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  font-style: italic;
`;

export function QuestReviewModal({
    isOpen,
    onClose,
    onSubmit,
    quest,
    linkedTasks = [],
}: QuestReviewModalProps) {
    const { t } = useTranslation();
    const [review, setReview] = useState('');
    const [whatWentWell, setWhatWentWell] = useState('');
    const [whatCouldImprove, setWhatCouldImprove] = useState('');
    const [satisfaction, setSatisfaction] = useState<number>(3);

    // AI Analysis state
    const [phase, setPhase] = useState<ModalPhase>('review');
    const [analyzingStep, setAnalyzingStep] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const activeRequestRef = useRef(0);

    const [quoteIndex, setQuoteIndex] = useState(0);

    const analyzingSteps = [
        { text: t('quest.review.analyzing_step_1'), progress: 25 },
        { text: t('quest.review.analyzing_step_2'), progress: 50 },
        { text: t('quest.review.analyzing_step_3'), progress: 75 },
        { text: t('quest.review.analyzing_step_4'), progress: 100 },
    ];

    const quoteKeys = [
        'quest.review.quote_1',
        'quest.review.quote_2',
        'quest.review.quote_3',
        'quest.review.quote_4',
        'quest.review.quote_5',
    ] as const;
    const quote = t(quoteKeys[quoteIndex] ?? quoteKeys[0]);

    useEffect(() => {
        if (!isOpen || !quest?.id) return;
        setQuoteIndex(Math.floor(Math.random() * 5));
    }, [isOpen, quest?.id]);

    const satisfactionLevels = [
        { level: 1, emoji: '😫', label: t('quest.review.satisfaction_1') },
        { level: 2, emoji: '😐', label: t('quest.review.satisfaction_2') },
        { level: 3, emoji: '😊', label: t('quest.review.satisfaction_3') },
        { level: 4, emoji: '😄', label: t('quest.review.satisfaction_4') },
        { level: 5, emoji: '🤩', label: t('quest.review.satisfaction_5') },
    ];

    // Calculate quest stats
    const questStats = useMemo(() => {
        if (!quest) return { duration: 0, taskCount: 0, completedCount: 0 };

        const startDate = quest.startDate ? new Date(quest.startDate) : new Date(quest.createdAt);
        const endDate = new Date();
        const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const completedCount = linkedTasks.filter(t => t.completed).length;

        return {
            duration: durationDays,
            taskCount: linkedTasks.length,
            completedCount,
        };
    }, [quest, linkedTasks]);

    const resetForm = useCallback(() => {
        setReview('');
        setWhatWentWell('');
        setWhatCouldImprove('');
        setSatisfaction(3);
        setPhase('review');
        setAnalyzingStep(0);
        setAnalysisResult(null);
        activeRequestRef.current += 1;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);

    const handleSubmit = async () => {
        if (!quest || phase === 'analyzing') return;
        activeRequestRef.current += 1;
        const requestId = activeRequestRef.current;
        const currentQuestId = quest.id;

        // Submit the review data first
        onSubmit({
            questId: quest.id,
            review: review.trim(),
            satisfaction,
            whatWentWell: whatWentWell.trim() || undefined,
            whatCouldImprove: whatCouldImprove.trim() || undefined,
        });

        // Start analyzing phase
        setPhase('analyzing');

        // Animate through steps
        for (let i = 0; i < analyzingSteps.length; i++) {
            if (!isOpen || activeRequestRef.current !== requestId || quest?.id !== currentQuestId) {
                return;
            }
            setAnalyzingStep(i);
            await new Promise((resolve) => setTimeout(resolve, 400));
        }

        // Generate summary
        try {
            const result = await generateQuestCompletionSummary(quest, linkedTasks, review);
            if (!isOpen || quest?.id !== currentQuestId || activeRequestRef.current !== requestId) {
                return;
            }
            if (result.summary) {
                setAnalysisResult({
                    summary: result.summary,
                    keyAchievements: result.keyAchievements,
                    lessonsLearned: result.lessonsLearned,
                    affirmation: result.affirmation,
                });
            } else {
                // Fallback summary
                setAnalysisResult({
                    summary: t('quest.review.summary_fallback', {
                        title: quest.title,
                        completed: questStats.completedCount,
                        duration: questStats.duration,
                    }),
                    affirmation: quote,
                });
            }
        } catch {
            if (!isOpen || quest?.id !== currentQuestId || activeRequestRef.current !== requestId) {
                return;
            }
            // Fallback summary
            setAnalysisResult({
                summary: t('quest.review.summary_fallback', {
                    title: quest.title,
                    completed: questStats.completedCount,
                    duration: questStats.duration,
                }),
                affirmation: quote,
            });
        }

        if (!isOpen || quest?.id !== currentQuestId || activeRequestRef.current !== requestId) {
            return;
        }
        setPhase('result');
    };

    const handleSkip = () => {
        if (!quest) return;

        onSubmit({
            questId: quest.id,
            review: '',
            satisfaction: 3,
        });

        resetForm();
        onClose();
    };

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    if (!quest) return null;

    // Render based on phase
    const renderContent = () => {
        switch (phase) {
            case 'analyzing':
                return (
                    <AnalyzingContainer>
                        <AnalyzingIcon>🎯</AnalyzingIcon>
                        <AnalyzingText>{analyzingSteps[analyzingStep]?.text}</AnalyzingText>
                        <ProgressBar>
                            <ProgressFill $progress={analyzingSteps[analyzingStep]?.progress || 0} />
                        </ProgressBar>
                    </AnalyzingContainer>
                );

            case 'result':
                return (
                    <ResultContainer>
                        <QuestInfo>
                            <QuestTitle>✅ {quest.title}</QuestTitle>
                            <QuestMeta>
                                <MetaItem>{t('quest.review.meta_duration', { duration: questStats.duration })}</MetaItem>
                                <MetaItem>{t('quest.review.meta_completed', { completed: questStats.completedCount, total: questStats.taskCount })}</MetaItem>
                            </QuestMeta>
                        </QuestInfo>

                        {analysisResult && (
                            <>
                                <ResultSection>
                                    <ResultTitle>{t('quest.review.section_summary')}</ResultTitle>
                                    <ResultText>{analysisResult.summary}</ResultText>
                                </ResultSection>

                                {analysisResult.keyAchievements && analysisResult.keyAchievements.length > 0 && (
                                    <ResultSection>
                                        <ResultTitle>{t('quest.review.section_achievements')}</ResultTitle>
                                        <ResultList>
                                            {analysisResult.keyAchievements.map((achievement, i) => (
                                                <li key={i}>{achievement}</li>
                                            ))}
                                        </ResultList>
                                    </ResultSection>
                                )}

                                {analysisResult.lessonsLearned && analysisResult.lessonsLearned.length > 0 && (
                                    <ResultSection>
                                        <ResultTitle>{t('quest.review.section_lessons')}</ResultTitle>
                                        <ResultList>
                                            {analysisResult.lessonsLearned.map((lesson, i) => (
                                                <li key={i}>{lesson}</li>
                                            ))}
                                        </ResultList>
                                    </ResultSection>
                                )}

                                {analysisResult.affirmation && (
                                    <AffirmationBox>
                                        ✨ {analysisResult.affirmation}
                                    </AffirmationBox>
                                )}
                            </>
                        )}

                        <ButtonRow>
                            <Button onClick={handleClose}>{t('quest.review.done')}</Button>
                        </ButtonRow>
                    </ResultContainer>
                );

            default: // review phase
                return (
                    <ReviewContainer>
                        <QuestInfo>
                            <QuestTitle>🎯 {quest.title}</QuestTitle>
                            <QuestMeta>
                                <MetaItem>{t('quest.review.meta_duration', { duration: questStats.duration })}</MetaItem>
                                <MetaItem>{t('quest.review.meta_completed_short', { completed: questStats.completedCount, total: questStats.taskCount })}</MetaItem>
                            </QuestMeta>
                        </QuestInfo>

                        <div style={{
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1))',
                            borderLeft: '4px solid #8b5cf6',
                            borderRadius: '0 10px 10px 0',
                            padding: '16px',
                            fontStyle: 'italic',
                            color: '#6b7280'
                        }}>
                            💫 {quote}
                        </div>

                        <SatisfactionGroup>
                            <MetricLabel>{t('quest.review.overall_satisfaction')}</MetricLabel>
                            <SatisfactionButtons>
                                {satisfactionLevels.map((level) => (
                                    <SatisfactionButton
                                        key={level.level}
                                        $selected={satisfaction === level.level}
                                        onClick={() => setSatisfaction(level.level)}
                                        type="button"
                                    >
                                        <span>{level.emoji}</span>
                                        <span>{level.label}</span>
                                    </SatisfactionButton>
                                ))}
                            </SatisfactionButtons>
                        </SatisfactionGroup>

                        <MetricGroup>
                            <MetricLabel htmlFor="quest-went-well">{t('quest.review.went_well_label')}</MetricLabel>
                            <Textarea
                                id="quest-went-well"
                                name="whatWentWell"
                                value={whatWentWell}
                                onChange={(e) => setWhatWentWell(e.target.value)}
                                placeholder={t('quest.review.went_well_placeholder')}
                                minRows={2}
                            />
                        </MetricGroup>

                        <MetricGroup>
                            <MetricLabel htmlFor="quest-could-improve">{t('quest.review.improve_label')}</MetricLabel>
                            <Textarea
                                id="quest-could-improve"
                                name="whatCouldImprove"
                                value={whatCouldImprove}
                                onChange={(e) => setWhatCouldImprove(e.target.value)}
                                placeholder={t('quest.review.improve_placeholder')}
                                minRows={2}
                            />
                        </MetricGroup>

                        <MetricGroup>
                            <MetricLabel htmlFor="quest-review">{t('quest.review.extra_label')}</MetricLabel>
                            <Textarea
                                id="quest-review"
                                name="review"
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                placeholder={t('quest.review.extra_placeholder')}
                                minRows={2}
                            />
                        </MetricGroup>

                        <ButtonRow>
                            <Button type="button" variant="secondary" onClick={handleSkip}>
                                {t('quest.review.skip')}
                            </Button>
                            <Button onClick={handleSubmit}>
                                {t('quest.review.submit')}
                            </Button>
                        </ButtonRow>
                    </ReviewContainer>
                );
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={phase === 'analyzing' ? () => { } : handleClose}
            title={
                phase === 'analyzing'
                    ? t('quest.review.modal_title_analyzing')
                    : phase === 'result'
                        ? t('quest.review.modal_title_complete')
                        : t('quest.review.modal_title_complete')
            }
            subtitle={
                phase === 'analyzing'
                    ? t('quest.review.modal_subtitle_wait')
                    : phase === 'result'
                        ? undefined
                        : t('quest.review.modal_subtitle_record')
            }
            size="md"
        >
            {renderContent()}
        </Modal>
    );
}

export default QuestReviewModal;
