import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';

const WEEKS = 18;
const DAYS = 7;

export default function ContributionGrid() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const byDay = ctx.byDay();

  // Start from Sunday 18 weeks ago
  const now = new Date();
  const todaySunday = new Date(now);
  todaySunday.setDate(now.getDate() - now.getDay()); // back to Sunday
  todaySunday.setHours(0, 0, 0, 0);

  const startDate = new Date(todaySunday);
  startDate.setDate(startDate.getDate() - (WEEKS - 1) * 7);

  const columns: JSX.Element[] = [];

  for (let w = 0; w < WEEKS; w++) {
    const cells: JSX.Element[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      date.setHours(0, 0, 0, 0);

      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const isFuture = date > now;
      const count = byDay[key] || 0;

      let bgColor: string;
      if (isFuture) {
        bgColor = 'transparent';
      } else {
        bgColor = ctx.levelColor(count);
      }

      cells.push(
        <View
          key={d}
          style={[
            styles.cell,
            { backgroundColor: bgColor },
          ]}
        />
      );
    }
    columns.push(
      <View key={w} style={styles.column}>
        {cells}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {columns}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  column: {
    flex: 1,
    gap: 3,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: 3,
  },
});
