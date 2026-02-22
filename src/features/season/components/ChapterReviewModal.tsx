import { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Modal, Button, Textarea } from '../../../components/ui';
import { useTranslation } from '../../../lib/i18n/useTranslation';
import { generateChapterCompletionSummary } from '../../../services/reflection-service';
import type { Chapter, MainQuest } from '../../../types/task';

export interface ChapterReviewData {
  chapterId: string;
  review: string;
  satisfaction: number;
}

interface ChapterReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ChapterReviewData) => void;
  chapter: Chapter | null;
  linkedQuests?: MainQuest[];
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

const ChapterInfo = styled.div`
  background: ${({ theme }) => theme.colors.card.purple.bg};
  border: 1px solid ${({ theme }) => theme.colors.accent.purple};
  border-radius: 10px;
  padding: 16px;
`;

const ChapterTitle = styled.h4`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChapterMeta = styled.div`
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

const MetricLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
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
`;

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

export function ChapterReviewModal({
  isOpen,
  onClose,
  onSubmit,
  chapter,
  linkedQuests = [],
}: ChapterReviewModalProps) {
  const { t } = useTranslation();
  const [review, setReview] = useState('');
  const [satisfaction, setSatisfaction] = useState<number>(3);
  const [phase, setPhase] = useState<ModalPhase>('review');
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const analyzingSteps = [
    { text: t('chapter.review.analyzing_step_1'), progress: 25 },
    { text: t('chapter.review.analyzing_step_2'), progress: 50 },
    { text: t('chapter.review.analyzing_step_3'), progress: 75 },
    { text: t('chapter.review.analyzing_step_4'), progress: 100 },
  ];

  const quoteKeys = [
    'chapter.review.quote_1',
    'chapter.review.quote_2',
    'chapter.review.quote_3',
    'chapter.review.quote_4',
    'chapter.review.quote_5',
  ] as const;
  const quote = t(quoteKeys[quoteIndex] ?? quoteKeys[0]);

  useEffect(() => {
    if (!isOpen || !chapter?.id) return;
    setQuoteIndex(Math.floor(Math.random() * 5));
  }, [isOpen, chapter?.id]);

  const chapterStats = useMemo(() => {
    if (!chapter) return { duration: 0, total: 0, completed: 0 };
    const startDate = chapter.startedAt ? new Date(chapter.startedAt) : new Date();
    const endDate = chapter.completedAt ? new Date(chapter.completedAt) : new Date();
    const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const completed = linkedQuests.filter((q) => q.status === 'completed').length;
    return { duration, total: linkedQuests.length, completed };
  }, [chapter, linkedQuests]);

  const resetForm = useCallback(() => {
    setReview('');
    setSatisfaction(3);
    setPhase('review');
    setAnalyzingStep(0);
    setAnalysisResult(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!chapter) return;
    onSubmit({ chapterId: chapter.id, review: review.trim(), satisfaction });
    setPhase('analyzing');

    for (let i = 0; i < analyzingSteps.length; i++) {
      setAnalyzingStep(i);
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    try {
      const result = await generateChapterCompletionSummary(chapter, linkedQuests, review);
      setAnalysisResult({
        summary: result.summary || t('chapter.review.summary_fallback', { title: chapter.title }),
        keyAchievements: result.keyAchievements,
        lessonsLearned: result.lessonsLearned,
        affirmation: result.affirmation,
      });
    } catch {
      setAnalysisResult({
        summary: t('chapter.review.summary_fallback', { title: chapter.title }),
      });
    }
    setPhase('result');
  }, [analyzingSteps.length, chapter, linkedQuests, onSubmit, review, satisfaction, t]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const satisfactionLevels = [
    { level: 1, emoji: '😫', label: t('quest.review.satisfaction_1') },
    { level: 2, emoji: '😐', label: t('quest.review.satisfaction_2') },
    { level: 3, emoji: '😊', label: t('quest.review.satisfaction_3') },
    { level: 4, emoji: '😄', label: t('quest.review.satisfaction_4') },
    { level: 5, emoji: '🤩', label: t('quest.review.satisfaction_5') },
  ];

  if (!chapter) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        phase === 'analyzing'
          ? t('chapter.review.modal_title_analyzing')
          : t('chapter.review.modal_title_complete')
      }
      subtitle={phase === 'analyzing' ? t('chapter.review.modal_subtitle_wait') : t('chapter.review.modal_subtitle_record')}
      size="md"
    >
      {phase === 'analyzing' && (
        <AnalyzingContainer>
          <AnalyzingIcon>🧠</AnalyzingIcon>
          <AnalyzingText>{analyzingSteps[analyzingStep]?.text || t('chapter.review.analyzing_step_1')}</AnalyzingText>
          <ProgressBar>
            <ProgressFill $progress={analyzingSteps[analyzingStep]?.progress || 0} />
          </ProgressBar>
        </AnalyzingContainer>
      )}

      {phase === 'result' && analysisResult && (
        <ResultContainer>
          <ChapterInfo>
            <ChapterTitle>📖 {chapter.title}</ChapterTitle>
            <ChapterMeta>
              <MetaItem>{t('chapter.review.meta_duration', { duration: chapterStats.duration })}</MetaItem>
              <MetaItem>{t('chapter.review.meta_completed', { completed: chapterStats.completed, total: chapterStats.total })}</MetaItem>
            </ChapterMeta>
          </ChapterInfo>

          <ResultSection>
            <ResultTitle>{t('quest.review.section_summary')}</ResultTitle>
            <ResultText>{analysisResult.summary}</ResultText>
          </ResultSection>

          {analysisResult.keyAchievements && analysisResult.keyAchievements.length > 0 && (
            <ResultSection>
              <ResultTitle>{t('quest.review.section_achievements')}</ResultTitle>
              <ResultList>
                {analysisResult.keyAchievements.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ResultList>
            </ResultSection>
          )}

          {analysisResult.lessonsLearned && analysisResult.lessonsLearned.length > 0 && (
            <ResultSection>
              <ResultTitle>{t('quest.review.section_lessons')}</ResultTitle>
              <ResultList>
                {analysisResult.lessonsLearned.map((item, idx) => (
                  <li key={`${item}-${idx}`}>{item}</li>
                ))}
              </ResultList>
            </ResultSection>
          )}

          {analysisResult.affirmation && <AffirmationBox>{analysisResult.affirmation}</AffirmationBox>}

          <ButtonRow>
            <Button onClick={handleClose}>{t('quest.review.done')}</Button>
          </ButtonRow>
        </ResultContainer>
      )}

      {phase === 'review' && (
        <ReviewContainer>
          <ChapterInfo>
            <ChapterTitle>📖 {chapter.title}</ChapterTitle>
            <ChapterMeta>
              <MetaItem>{t('chapter.review.meta_duration', { duration: chapterStats.duration })}</MetaItem>
              <MetaItem>{t('chapter.review.meta_completed_short', { completed: chapterStats.completed, total: chapterStats.total })}</MetaItem>
            </ChapterMeta>
          </ChapterInfo>

          <AffirmationBox>{quote}</AffirmationBox>

          <div>
            <MetricLabel>{t('quest.review.overall_satisfaction')}</MetricLabel>
            <SatisfactionButtons>
              {satisfactionLevels.map((level) => (
                <SatisfactionButton
                  key={level.level}
                  type="button"
                  $selected={satisfaction === level.level}
                  onClick={() => setSatisfaction(level.level)}
                >
                  <span>{level.emoji}</span>
                  <span>{level.label}</span>
                </SatisfactionButton>
              ))}
            </SatisfactionButtons>
          </div>

          <div>
            <MetricLabel htmlFor="chapter-review">{t('chapter.review.input_label')}</MetricLabel>
            <Textarea
              id="chapter-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t('chapter.review.input_placeholder')}
              rows={4}
            />
          </div>

          <ButtonRow>
            <Button variant="secondary" onClick={handleClose}>
              {t('quest.review.skip')}
            </Button>
            <Button onClick={handleSubmit}>{t('quest.review.submit')}</Button>
          </ButtonRow>
        </ReviewContainer>
      )}
    </Modal>
  );
}

export default ChapterReviewModal;
