import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { SalesPoint } from '@/data/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { colors, layout, radius, spacing } from '@/theme';
import { formatMoneyCompact, formatNumber } from '@/utils/format';

/** Largeur disponible pour un graphique placé dans une carte pleine largeur. */
const useChartWidth = (extra = 0): number => {
  const { width } = useWindowDimensions();
  const { screenPadding } = useBreakpoint();
  return Math.min(width, layout.maxContentWidth) - screenPadding * 2 - spacing.lg * 2 - extra;
};

interface ChartProps {
  data: SalesPoint[];
  height?: number;
  /** Formatage des valeurs affichées sur l'axe et dans les info-bulles. */
  format?: (value: number) => string;
}

/**
 * Courbe d'évolution avec aire dégradée. Écrite en SVG plutôt qu'avec une
 * librairie de graphiques : le besoin est simple et cela évite une dépendance
 * lourde sur mobile (section 24).
 */
export const LineChart = ({ data, height = 160, format = formatMoneyCompact }: ChartProps) => {
  const width = useChartWidth();

  if (data.length < 2 || width <= 0) return null;

  const max = Math.max(...data.map((point) => point.value), 1);
  const paddingBottom = 18;
  const usableHeight = height - paddingBottom;

  const x = (index: number) => (index / (data.length - 1)) * width;
  const y = (value: number) => usableHeight - (value / max) * (usableHeight - 8);

  const line = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join(' ');

  const area = `${line} L${width},${usableHeight} L0,${usableHeight} Z`;

  const lastIndex = data.length - 1;

  return (
    <View style={styles.chart}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.22" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1="0"
            y1={usableHeight * ratio}
            x2={width}
            y2={usableHeight * ratio}
            stroke={colors.border}
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        ))}

        <Path d={area} fill="url(#areaFill)" />
        <Path d={line} stroke={colors.primary} strokeWidth="2.5" fill="none" strokeLinejoin="round" />

        <Circle
          cx={x(lastIndex)}
          cy={y(data[lastIndex].value)}
          r="5"
          fill={colors.primary}
          stroke={colors.white}
          strokeWidth="2"
        />
      </Svg>

      <View style={styles.axis}>
        <AppText variant="micro" color={colors.mutedLight}>
          {data[0].label}
        </AppText>
        <AppText variant="micro" color={colors.mutedLight}>
          max {format(max)}
        </AppText>
        <AppText variant="micro" color={colors.mutedLight}>
          {data[lastIndex].label}
        </AppText>
      </View>
    </View>
  );
};

/** Histogramme vertical, utilisé pour le nombre de commandes par jour. */
export const BarChart = ({ data, height = 150, format = formatNumber }: ChartProps) => {
  const width = useChartWidth();

  if (data.length === 0 || width <= 0) return null;

  const max = Math.max(...data.map((point) => point.value), 1);
  const paddingBottom = 18;
  const usableHeight = height - paddingBottom;
  const gap = data.length > 10 ? 3 : 6;
  const barWidth = Math.max(4, (width - gap * (data.length - 1)) / data.length);

  return (
    <View style={styles.chart}>
      <Svg width={width} height={height}>
        {data.map((point, index) => {
          const barHeight = Math.max(2, (point.value / max) * (usableHeight - 6));

          return (
            <Rect
              key={`${point.label}-${index}`}
              x={index * (barWidth + gap)}
              y={usableHeight - barHeight}
              width={barWidth}
              height={barHeight}
              rx={Math.min(4, barWidth / 2)}
              fill={index === data.length - 1 ? colors.primary : colors.primarySoft}
            />
          );
        })}
      </Svg>

      <View style={styles.axis}>
        <AppText variant="micro" color={colors.mutedLight}>
          {data[0].label}
        </AppText>
        <AppText variant="micro" color={colors.mutedLight}>
          max {format(max)}
        </AppText>
        <AppText variant="micro" color={colors.mutedLight}>
          {data[data.length - 1].label}
        </AppText>
      </View>
    </View>
  );
};

const SLICE_COLORS = [
  colors.primary,
  colors.success,
  colors.warning,
  colors.danger,
  colors.inkSoft,
  colors.mutedLight,
];

/** Répartition du chiffre d'affaires par catégorie, en anneau + légende. */
export const DonutChart = ({ data, size = 132 }: { data: SalesPoint[]; size?: number }) => {
  const total = data.reduce((sum, point) => sum + point.value, 0);

  if (total <= 0) return null;

  const slices = data.slice(0, 5);
  const others = data.slice(5).reduce((sum, point) => sum + point.value, 0);
  const legend = others > 0 ? [...slices, { label: 'Autres', value: others }] : slices;

  const stroke = 18;
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;

  let offset = 0;

  return (
    <View style={styles.donutRow}>
      <Svg width={size} height={size}>
        {legend.map((point, index) => {
          const fraction = point.value / total;
          const dash = fraction * circumference;
          const element = (
            <Circle
              key={point.label}
              cx={size / 2}
              cy={size / 2}
              r={radiusValue}
              stroke={SLICE_COLORS[index % SLICE_COLORS.length]}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              // L'anneau démarre en haut plutôt qu'à droite.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );

          offset += dash;
          return element;
        })}
      </Svg>

      <View style={styles.legend}>
        {legend.map((point, index) => (
          <View key={point.label} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] },
              ]}
            />

            <AppText variant="micro" numberOfLines={1} style={styles.legendLabel}>
              {point.label}
            </AppText>

            <AppText variant="micro" color={colors.ink}>
              {Math.round((point.value / total) * 100)} %
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  width?: number;
  onPress?: () => void;
}

const TONES = {
  neutral: { bg: colors.surfaceSunken, fg: colors.inkSoft },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
} as const;

/** Vignette de KPI du tableau de bord (section 16). */
export const StatCard = ({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  width,
}: StatCardProps) => {
  const palette = TONES[tone];

  return (
    <View style={[styles.statCard, width ? { width } : styles.statCardFlex]}>
      <View style={[styles.statIcon, { backgroundColor: palette.bg }]}>
        <Ionicons name={icon} size={17} color={palette.fg} />
      </View>

      <AppText variant="micro" color={colors.muted} numberOfLines={1}>
        {label}
      </AppText>

      <AppText variant="heading" numberOfLines={1}>
        {value}
      </AppText>

      {hint ? (
        <AppText variant="micro" color={colors.mutedLight} numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chart: { gap: spacing.xs },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  legend: { flex: 1, gap: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 9, height: 9, borderRadius: radius.pill },
  legendLabel: { flex: 1 },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 3,
  },
  statCardFlex: { flex: 1 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
