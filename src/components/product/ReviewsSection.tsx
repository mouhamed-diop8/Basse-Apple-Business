import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Divider,
  Rating,
  RatingPicker,
  SectionHeader,
} from '@/components/ui';
import { db } from '@/data';
import { RepositoryError } from '@/data/repository';
import { Review } from '@/data/types';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';
import { colors, fontSize, radius, spacing } from '@/theme';
import { formatDate } from '@/utils/format';

interface ReviewsSectionProps {
  productId: string;
  reviews: Review[];
  rating: number;
  reviewsCount: number;
  onReviewAdded: (review: Review) => void;
}

const MAX_VISIBLE = 3;

export const ReviewsSection = ({
  productId,
  reviews,
  rating,
  reviewsCount,
  onReviewAdded,
}: ReviewsSectionProps) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [expanded, setExpanded] = useState(false);
  const [composing, setComposing] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const visible = expanded ? reviews : reviews.slice(0, MAX_VISIBLE);
  const alreadyReviewed = user ? reviews.some((review) => review.user_id === user.id) : false;

  const submit = async () => {
    if (!user) return;

    if (comment.trim().length < 5) {
      toast.error('Votre commentaire est un peu court : décrivez votre expérience.');
      return;
    }

    setSaving(true);

    try {
      const review = await db.addReview({
        product_id: productId,
        user_id: user.id,
        author_first_name: user.first_name,
        rating: score,
        comment: comment.trim(),
      });

      onReviewAdded(review);
      setComposing(false);
      setComment('');
      setScore(5);
      toast.success('Merci, votre avis est publié.');
    } catch (error) {
      toast.error(
        error instanceof RepositoryError ? error.message : 'Impossible de publier votre avis.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Avis clients"
        subtitle={
          reviewsCount > 0
            ? `${rating.toFixed(1)} sur 5 · ${reviewsCount} avis`
            : 'Aucun avis pour le moment'
        }
        actionLabel={reviews.length > MAX_VISIBLE && !expanded ? 'Tout voir' : undefined}
        onAction={() => setExpanded(true)}
      />

      {reviews.length === 0 ? (
        <Card>
          <AppText variant="caption">
            Soyez le premier à donner votre avis sur ce produit.
          </AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {visible.map((review, index) => (
            <View key={review.id}>
              {index > 0 ? <Divider /> : null}

              <View style={styles.review}>
                <View style={styles.reviewHeader}>
                  <AppText variant="captionStrong">{review.author_first_name}</AppText>
                  <AppText variant="micro" color={colors.mutedLight}>
                    {formatDate(review.created_at)}
                  </AppText>
                </View>

                <Rating value={review.rating} size={12} showValue={false} />

                <AppText variant="caption" color={colors.inkSoft}>
                  {review.comment}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      )}

      {!user ? (
        <Button
          label="Connectez-vous pour laisser un avis"
          variant="outline"
          icon="log-in-outline"
          onPress={() => router.push('/auth/connexion')}
        />
      ) : alreadyReviewed ? (
        <AppText variant="micro" color={colors.muted} center>
          Vous avez déjà donné votre avis sur ce produit.
        </AppText>
      ) : composing ? (
        <Card style={styles.composer}>
          <AppText variant="bodyStrong">Votre avis</AppText>

          <RatingPicker value={score} onChange={setScore} />

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Qu’avez-vous pensé de ce produit ?"
            placeholderTextColor={colors.mutedLight}
            multiline
            numberOfLines={4}
            style={styles.textarea}
            accessibilityLabel="Votre commentaire"
          />

          <View style={styles.composerActions}>
            <Button
              label="Annuler"
              variant="ghost"
              size="sm"
              onPress={() => setComposing(false)}
            />
            <Button label="Publier" size="sm" loading={saving} onPress={submit} />
          </View>
        </Card>
      ) : (
        <Button
          label="Donner mon avis"
          variant="outline"
          icon="create-outline"
          onPress={() => setComposing(true)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  review: { padding: spacing.lg, gap: spacing.xs },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composer: { gap: spacing.md },
  textarea: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  composerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
