import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Sliders,
  Check,
  Sparkles,
  TrendingDown,
  TrendingUp,
  MinusCircle,
} from 'lucide-react-native';
import { useStore, UserProfile, calculateBMR, calculateTDEE, calculateTargets } from '../store';
import { saveUserDataToCloud } from '../lib/sync';

interface GoalFocusEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function GoalFocusEditorModal({
  visible,
  onClose,
  onSaved,
}: GoalFocusEditorModalProps) {
  const { profile, updateProfile, dailyLogs, weightHistory, user, isDarkMode: dark } = useStore();

  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [weight, setWeight] = useState('70');
  const [targetWeight, setTargetWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [age, setAge] = useState('28');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');
  const [weeklyRate, setWeeklyRate] = useState<number>(0.5);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible && profile) {
      setGoal(profile.goal || (profile.weightGoal?.includes('lose') ? 'lose' : profile.weightGoal?.includes('gain') ? 'gain' : 'maintain'));
      setWeight(profile.weight ? String(profile.weight) : '70');
      setTargetWeight(profile.targetWeight ? String(profile.targetWeight) : String(profile.weight || 70));
      setHeight(profile.height ? String(profile.height) : '175');
      setAge(profile.age ? String(profile.age) : '28');
      setGender(profile.gender || 'male');
      setActivityLevel(profile.activityLevel || 'moderate');
      setWeeklyRate(profile.weeklyRate || 0.5);
      setErrorMsg('');
    }
  }, [visible, profile]);

  // Color tokens
  const bg = dark ? '#0a0a0a' : '#f8fafc';
  const cardBg = dark ? '#0f172a' : '#ffffff';
  const cardBorder = dark ? '#1e293b' : '#e5e7eb';
  const headerBg = dark ? '#0f172a' : '#ffffff';
  const inputBg = dark ? '#1e293b' : '#f8fafc';
  const inputBorder = dark ? '#334155' : '#e5e7eb';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = '#94a3b8';
  const teal = '#14B8A6';
  const tealLight = 'rgba(20,184,166,0.1)';
  const inactiveBtn = dark ? '#1e293b' : '#f1f5f9';
  const inactiveBtnBorder = dark ? '#334155' : '#e5e7eb';

  const numWeight = parseFloat(weight) || 70;
  const numTargetWeight = parseFloat(targetWeight) || numWeight;
  const numHeight = parseFloat(height) || 175;
  const numAge = parseInt(age, 10) || 28;

  let computedWeightGoal: UserProfile['weightGoal'] = 'maintain';
  if (goal === 'lose') {
    computedWeightGoal = weeklyRate >= 0.75 ? 'lose_fast' : 'lose_slow';
  } else if (goal === 'gain') {
    computedWeightGoal = weeklyRate >= 0.4 ? 'gain_fast' : 'gain_slow';
  }

  const liveBmr = calculateBMR(numWeight, numHeight, numAge, gender);
  const liveTdee = calculateTDEE(liveBmr, activityLevel);
  const liveTargets = calculateTargets(liveTdee, computedWeightGoal);

  // Auto-correct target weight when goal changes
  const handleGoalChange = (newGoal: 'lose' | 'maintain' | 'gain') => {
    setGoal(newGoal);
    setErrorMsg('');
    const cur = parseFloat(weight) || 70;
    if (newGoal === 'lose') {
      // Auto-suggest target as current - 5 if target >= current
      const tgt = parseFloat(targetWeight) || cur;
      if (tgt >= cur) setTargetWeight(String(Math.max(cur - 5, 1)));
    } else if (newGoal === 'gain') {
      // Auto-suggest target as current + 5 if target <= current
      const tgt = parseFloat(targetWeight) || cur;
      if (tgt <= cur) setTargetWeight(String(cur + 5));
    }
  };

  const handleSave = async () => {
    if (!weight.trim() || numWeight <= 0) { setErrorMsg('Please enter a valid current weight.'); return; }
    if (!height.trim() || numHeight <= 0) { setErrorMsg('Please enter a valid height.'); return; }
    if (!age.trim() || numAge <= 0) { setErrorMsg('Please enter a valid age.'); return; }

    // Validate target weight based on goal
    if (goal === 'lose') {
      if (numTargetWeight >= numWeight) {
        setErrorMsg('❌ Target weight must be less than current weight for Lose Weight goal.');
        return;
      }
    } else if (goal === 'gain') {
      if (numTargetWeight <= numWeight) {
        setErrorMsg('❌ Target weight must be greater than current weight for Gain Weight goal.');
        return;
      }
    }

    const updatedFields: Partial<UserProfile> = {
      goal,
      weight: numWeight,
      targetWeight: goal === 'maintain' ? numWeight : numTargetWeight,
      height: numHeight,
      age: numAge,
      gender,
      activityLevel,
      weeklyRate: goal === 'maintain' ? 0 : weeklyRate,
      weightGoal: computedWeightGoal,
      onboardingComplete: true,
      ...liveTargets,
    };

    updateProfile(updatedFields);

    if (user?.uid) {
      try {
        await saveUserDataToCloud(user.uid, {
          profile: { ...profile, ...updatedFields },
          dailyLogs,
          weightHistory,
        });
      } catch (err) {
        console.warn('Failed to sync updated profile to cloud:', err);
      }
    }

    if (onSaved) onSaved();
    onClose();
  };

  const goalOptions = [
    { key: 'lose', label: 'Lose Weight', icon: TrendingDown, color: '#EF4444' },
    { key: 'maintain', label: 'Maintain', icon: MinusCircle, color: '#3B82F6' },
    { key: 'gain', label: 'Gain Weight', icon: TrendingUp, color: '#10B981' },
  ];

  const paceOptions = [
    { rate: 0.25, label: 'Slow & Steady', desc: '0.25 kg / week' },
    { rate: 0.50, label: 'Moderate Pace', desc: '0.5 kg / week (Recommended)' },
    { rate: 1.00, label: 'Aggressive Goal', desc: '1.0 kg / week' },
  ];

  const activityOptions = [
    { key: 'sedentary', title: 'Sedentary', desc: 'Little to no exercise, desk job' },
    { key: 'light', title: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
    { key: 'moderate', title: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
    { key: 'active', title: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[s.root, { backgroundColor: bg }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex1}>

          {/* Header */}
          <View style={[s.header, { backgroundColor: headerBg, borderBottomColor: cardBorder }]}>
            <View>
              <View style={s.row}>
                <Sliders size={18} color={teal} />
                <Text style={[s.headerTitle, { color: textPrimary }]}>Goal & Fitness Settings</Text>
              </View>
              <Text style={[s.headerSub, { color: textMuted }]}>Single-page Goal Focus Editor</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[s.closeBtn, { backgroundColor: inactiveBtn }]}
            >
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            {/* 1. Goal Focus */}
            <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[s.sectionLabel, { color: teal }]}>1. Select Goal Focus</Text>
              <View style={s.row}>
                {goalOptions.map((item) => {
                  const IconComp = item.icon;
                  const isSel = goal === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.8}
                      onPress={() => { handleGoalChange(item.key as any); }}
                      style={[
                        s.goalBtn,
                        { backgroundColor: isSel ? teal : inactiveBtn, borderColor: isSel ? teal : inactiveBtnBorder },
                      ]}
                    >
                      <IconComp size={20} color={isSel ? '#ffffff' : item.color} />
                      <Text style={[s.goalBtnText, { color: isSel ? '#ffffff' : textMuted }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Body Metrics */}
            <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[s.sectionLabel, { color: teal }]}>2. Body Metrics & Target Weight</Text>

              <View style={[s.row, { marginBottom: 12 }]}>
                {/* Current Weight */}
                <View style={s.flex1}>
                  <Text style={[s.inputLabel, { color: textMuted }]}>Current Weight (kg)</Text>
                  <TextInput
                    value={weight}
                    onChangeText={(v) => { setWeight(v); setErrorMsg(''); }}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor="#a3a3a3"
                    style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  />
                </View>
                <View style={s.inputSpacer} />
                {/* Target Weight */}
                <View style={s.flex1}>
                  <Text style={[s.inputLabel, { color: textMuted }]}>
                    {goal !== 'maintain' ? 'Target Weight (kg)' : 'Target Difference'}
                  </Text>
                  {goal !== 'maintain' ? (
                    <>
                      <TextInput
                        value={targetWeight}
                        onChangeText={(v) => { setTargetWeight(v); setErrorMsg(''); }}
                        keyboardType="numeric"
                        placeholder={goal === 'lose' ? String(Math.max(numWeight - 5, 1)) : String(numWeight + 5)}
                        placeholderTextColor="#a3a3a3"
                        style={[
                          s.input,
                          {
                            backgroundColor: inputBg,
                            borderColor:
                              goal === 'lose' && numTargetWeight >= numWeight
                                ? '#EF4444'
                                : goal === 'gain' && numTargetWeight <= numWeight
                                ? '#EF4444'
                                : inputBorder,
                            color: textPrimary,
                          },
                        ]}
                      />
                      <Text style={{ fontSize: 9, marginTop: 3, fontWeight: 'bold',
                        color: (goal === 'lose' && numTargetWeight >= numWeight) || (goal === 'gain' && numTargetWeight <= numWeight)
                          ? '#EF4444' : '#94a3b8'
                      }}>
                        {goal === 'lose'
                          ? `Must be < ${numWeight} kg`
                          : `Must be > ${numWeight} kg`}
                      </Text>
                    </>
                  ) : (
                    <View style={[s.input, s.rowCenter, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Text style={{ color: textMuted, fontSize: 12 }}>0 kg (Steady)</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Height / Age / Gender */}
              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={[s.inputLabel, { color: textMuted }]}>Height (cm)</Text>
                  <TextInput
                    value={height}
                    onChangeText={(v) => { setHeight(v); setErrorMsg(''); }}
                    keyboardType="numeric"
                    placeholder="175"
                    placeholderTextColor="#a3a3a3"
                    style={[s.inputSm, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  />
                </View>
                <View style={s.inputSpacer} />
                <View style={s.flex1}>
                  <Text style={[s.inputLabel, { color: textMuted }]}>Age</Text>
                  <TextInput
                    value={age}
                    onChangeText={(v) => { setAge(v); setErrorMsg(''); }}
                    keyboardType="numeric"
                    placeholder="28"
                    placeholderTextColor="#a3a3a3"
                    style={[s.inputSm, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                  />
                </View>
                <View style={s.inputSpacer} />
                <View style={s.flex1}>
                  <Text style={[s.inputLabel, { color: textMuted }]}>Gender</Text>
                  <View style={[s.genderRow, { borderColor: inputBorder }]}>
                    {(['male', 'female'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setGender(g)}
                        activeOpacity={0.8}
                        style={[
                          s.genderBtn,
                          { backgroundColor: gender === g ? teal : inactiveBtn },
                        ]}
                      >
                        <Text style={{ color: gender === g ? '#fff' : textMuted, fontSize: 12, fontWeight: 'bold' }}>
                          {g === 'male' ? 'M' : 'F'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Weekly Pace */}
            {goal !== 'maintain' && (
              <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[s.sectionLabel, { color: teal }]}>3. Weekly Rate / Speed</Text>
                {paceOptions.map((opt) => {
                  const isSel = weeklyRate === opt.rate;
                  return (
                    <TouchableOpacity
                      key={opt.rate}
                      activeOpacity={0.8}
                      onPress={() => setWeeklyRate(opt.rate)}
                      style={[
                        s.optionRow,
                        { backgroundColor: isSel ? tealLight : inactiveBtn, borderColor: isSel ? teal : inactiveBtnBorder },
                      ]}
                    >
                      <View style={s.flex1}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSel ? teal : textPrimary }}>
                          {opt.label}
                        </Text>
                        <Text style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{opt.desc}</Text>
                      </View>
                      {isSel && <Check size={18} color={teal} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* 4. Activity Level */}
            <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[s.sectionLabel, { color: teal }]}>4. Activity Level</Text>
              {activityOptions.map((act) => {
                const isSel = activityLevel === act.key;
                return (
                  <TouchableOpacity
                    key={act.key}
                    activeOpacity={0.8}
                    onPress={() => setActivityLevel(act.key as any)}
                    style={[
                      s.optionRow,
                      { backgroundColor: isSel ? tealLight : inactiveBtn, borderColor: isSel ? teal : inactiveBtnBorder },
                    ]}
                  >
                    <View style={s.flex1}>
                      <View style={s.rowBetween}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: isSel ? teal : textPrimary }}>
                          {act.title}
                        </Text>
                        {isSel && <Check size={16} color={teal} />}
                      </View>
                      <Text style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{act.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5. Live Preview */}
            <View style={[s.card, { backgroundColor: dark ? 'rgba(20,184,166,0.06)' : '#f0fdfa', borderColor: dark ? 'rgba(20,184,166,0.3)' : '#99f6e4' }]}>
              <View style={[s.row, { marginBottom: 12 }]}>
                <Sparkles size={16} color={teal} />
                <Text style={[s.sectionLabel, { color: teal, marginLeft: 6, marginBottom: 0 }]}>Calculated Target Preview</Text>
              </View>
              <View style={[s.rowBetween, { marginBottom: 12 }]}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: textPrimary }}>
                  {liveTargets.calorieTarget}{' '}
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: teal }}>kcal / day</Text>
                </Text>
                <View style={{ backgroundColor: teal, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>AUTO CALCULATED</Text>
                </View>
              </View>
              <View style={[s.macroRow, { borderTopColor: dark ? 'rgba(20,184,166,0.2)' : '#99f6e4' }]}>
                {[
                  { val: `${liveTargets.proteinTarget}g`, lbl: 'Protein' },
                  { val: `${liveTargets.carbsTarget}g`, lbl: 'Carbs', border: true },
                  { val: `${liveTargets.fatTarget}g`, lbl: 'Fat' },
                ].map((m) => (
                  <View
                    key={m.lbl}
                    style={[
                      s.macroItem,
                      m.border ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: dark ? 'rgba(20,184,166,0.2)' : '#99f6e4' } : {},
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '900', color: textPrimary }}>{m.val}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: textMuted, textTransform: 'uppercase', marginTop: 2 }}>{m.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Error */}
            {!!errorMsg && (
              <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>
                {errorMsg}
              </Text>
            )}
          </ScrollView>

          {/* Save Bar */}
          <View style={[s.saveBar, { backgroundColor: headerBg, borderTopColor: cardBorder }]}>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.8}
              style={s.saveBtn}
            >
              <Check size={18} color="#ffffff" />
              <Text style={s.saveBtnText}>Save Goal Settings</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '900', marginLeft: 8 },
  headerSub: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginTop: 2 },
  closeBtn: { padding: 8, borderRadius: 999 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { justifyContent: 'center' },
  goalBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  goalBtnText: { fontSize: 11, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  inputLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  input: { height: 48, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, fontSize: 15, fontWeight: 'bold' },
  inputSm: { height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, fontSize: 13, fontWeight: 'bold' },
  inputSpacer: { width: 10 },
  genderRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', height: 44 },
  genderBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  saveBtn: {
    backgroundColor: '#14B8A6',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14B8A6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 8 },
});
