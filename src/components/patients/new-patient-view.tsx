'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  Users,
  Heart,
  ChevronLeft,
  Loader2,
  FileText,
  Activity,
  AlertTriangle,
  Cigarette,
  Wine,
  Pill,
  Salad,
  Dumbbell,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MAKATI_BARANGAYS } from '@/data/makati-barangays';
import { offlineFetch } from '@/lib/offline-fetch';
import {
  PAST_MEDICAL_OPTIONS,
  PREVIOUS_SURGERY_OPTIONS,
  FAMILY_HISTORY_CONDITIONS as FAMILY_HISTORY_OPTIONS,
  TRAUMA_OPTIONS,
  BLOOD_TRANSFUSION_OPTIONS,
  FAMILY_HISTORY_PRESENCE_OPTIONS as FAMILY_HISTORY_DROPDOWN_OPTIONS,
  SMOKING_OPTIONS,
  ALCOHOL_OPTIONS,
  DRUG_USE_OPTIONS,
  DIETARY_PATTERN_OPTIONS,
  PHYSICAL_ACTIVITY_OPTIONS,
  SLEEP_PATTERN_OPTIONS,
} from '@/lib/health-history-constants';

// ─── Constants ───────────────────────────────────────────────────────────────

const NAME_EXTENSIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

const OCCUPATIONS = [
  'Unemployed',
  'Housewife',
  'Student',
  'Employed \u2014 Non-hazardous',
  'Employed \u2014 Hazardous',
];

const MARITAL_STATUSES = [
  'Single',
  'Married',
  'Common-law',
  'Widowed',
  'Divorced/Separated',
];

const FAMILY_COMPOSITIONS = ['Nuclear', 'Extended', 'Single-parent', 'Blended'];

const INCOME_BRACKETS = [
  'Low Income (< \u20B112,082/month)',
  'Lower-Middle Income (\u20B112,082 \u2013 \u20B124,164/month)',
  'Middle Income (\u20B124,165 \u2013 \u20B172,498/month)',
  'Upper-Middle Income (\u20B172,499 \u2013 \u20B1120,830/month)',
  'High Income (> \u20B1120,830/month)',
];

// Health history constants imported from shared module (see imports above)
// NAME_EXTENSIONS, OCCUPATIONS, MARITAL_STATUSES, FAMILY_COMPOSITIONS, INCOME_BRACKETS
// are still defined locally below since they are patient-specific, not health-history-specific.

// ─── Types ───────────────────────────────────────────────────────────────────

interface NewPatientFormValues {
  surname: string;
  firstName: string;
  middleInitial: string;
  nameExtension: string;
  dateOfBirth: string;
  blockLotStreet: string;
  barangay: string;
  occupation: string;
  religion: string;
  maritalStatus: string;
  familyComposition: string;
  incomeBracket: string;
  allergies: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item)
    ? arr.filter((i) => i !== item)
    : [...arr, item];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NewPatientView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Health history state ──────────────────────────────────────────────────

  // Past Medical History
  const [pastMedicalSelected, setPastMedicalSelected] = useState<string[]>([]);
  const [pastMedicalOthersText, setPastMedicalOthersText] = useState('');

  // Previous Surgery
  const [previousSurgerySelected, setPreviousSurgerySelected] = useState<string[]>([]);
  const [previousSurgeryOthersText, setPreviousSurgeryOthersText] = useState('');

  // History of Trauma
  const [traumaValue, setTraumaValue] = useState('');
  const [traumaSpecify, setTraumaSpecify] = useState('');

  // History of Blood Transfusion
  const [bloodTransfusionValue, setBloodTransfusionValue] = useState('');
  const [bloodTransfusionSpecify, setBloodTransfusionSpecify] = useState('');

  // Family History
  const [familyHistoryDropdown, setFamilyHistoryDropdown] = useState('');
  const [familyHistorySelected, setFamilyHistorySelected] = useState<string[]>([]);
  const [familyHistoryOthersText, setFamilyHistoryOthersText] = useState('');

  // Smoking
  const [smokingValue, setSmokingValue] = useState('');
  const [smokingPackYears, setSmokingPackYears] = useState('');

  // Alcohol Intake
  const [alcoholValue, setAlcoholValue] = useState('');
  const [alcoholDrinksPerDay, setAlcoholDrinksPerDay] = useState('');

  // Drug Use
  const [drugUseValue, setDrugUseValue] = useState('');
  const [drugUseSubstance, setDrugUseSubstance] = useState('');

  // Dietary Pattern
  const [dietaryPatternValue, setDietaryPatternValue] = useState('');
  const [dietaryPatternSpecify, setDietaryPatternSpecify] = useState('');

  // Physical Activity & Sleep
  const [physicalActivity, setPhysicalActivity] = useState('');
  const [sleepPattern, setSleepPattern] = useState('');

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = useForm<NewPatientFormValues>({
    defaultValues: {
      surname: '',
      firstName: '',
      middleInitial: '',
      nameExtension: '',
      dateOfBirth: '',
      blockLotStreet: '',
      barangay: '',
      occupation: '',
      religion: '',
      maritalStatus: '',
      familyComposition: '',
      incomeBracket: '',
      allergies: '',
    },
  });

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (values: NewPatientFormValues) => {
    if (!currentNurse) {
      toast.error('You must be logged in to add a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      const healthHistory = JSON.stringify({
        pastMedicalHistory: {
          selected: pastMedicalSelected.filter((i) => i !== 'Others (specify)'),
          othersText: pastMedicalSelected.includes('Others (specify)')
            ? pastMedicalOthersText
            : '',
        },
        previousSurgery: {
          selected: previousSurgerySelected.filter((i) => i !== 'Others (specify)'),
          othersText: previousSurgerySelected.includes('Others (specify)')
            ? previousSurgeryOthersText
            : '',
        },
        historyOfTrauma: {
          value: traumaValue,
          specify: traumaValue === 'yes' ? traumaSpecify : '',
        },
        historyOfBloodTransfusion: {
          value: bloodTransfusionValue,
          specify: bloodTransfusionValue === 'yes' ? bloodTransfusionSpecify : '',
        },
        familyHistory: {
          value: familyHistoryDropdown,
          selected:
            familyHistoryDropdown === 'present'
              ? familyHistorySelected.filter((i) => i !== 'Others (specify)')
              : [],
          othersText:
            familyHistoryDropdown === 'present' &&
            familyHistorySelected.includes('Others (specify)')
              ? familyHistoryOthersText
              : '',
        },
        smoking: {
          value: smokingValue,
          packYears:
            smokingValue === 'former' || smokingValue === 'current'
              ? smokingPackYears
              : '',
        },
        alcoholIntake: {
          value: alcoholValue,
          drinksPerDay:
            alcoholValue === 'occasional' || alcoholValue === 'regular'
              ? alcoholDrinksPerDay
              : '',
        },
        drugUse: {
          value: drugUseValue,
          substance:
            drugUseValue === 'past' || drugUseValue === 'current'
              ? drugUseSubstance
              : '',
        },
        dietaryPattern: {
          value: dietaryPatternValue,
          specify: dietaryPatternValue === 'special' ? dietaryPatternSpecify : '',
        },
        physicalActivity,
        sleepPattern,
      });

      const payload = {
        nurseId: currentNurse.id,
        surname: values.surname.trim(),
        firstName: values.firstName.trim(),
        middleInitial: values.middleInitial.trim() || null,
        nameExtension: values.nameExtension === 'none' ? null : (values.nameExtension || null),
        dateOfBirth: values.dateOfBirth,
        blockLotStreet: values.blockLotStreet.trim() || null,
        barangay: values.barangay || null,
        occupation: values.occupation || null,
        religion: values.religion.trim() || null,
        maritalStatus: values.maritalStatus || null,
        familyComposition: values.familyComposition || null,
        incomeBracket: values.incomeBracket || null,
        healthHistory,
        allergies: values.allergies.trim() || null,
      };

      const res = await offlineFetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success || data.offline) {
        if (data.offline) {
          toast.success('Patient saved locally. Will sync when back online.', {
            description: 'Changes will be synced automatically.',
          });
          setCurrentView('patients');
        } else {
          toast.success(`Patient ${data.data.name} created successfully!`);
          setSelectedPatientId(data.data.id);
          setCurrentView('patient-profile');
        }
      } else {
        toast.error(data.error || 'Failed to create patient');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-7xl">
        {/* ═══════════════════════════════════════════════════════════════════
            CARD 1: Personal Information
        ═══════════════════════════════════════════════════════════════════ */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:border-rose-100/80 transition-all duration-200 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 lg:px-6 border-b border-rose-100/60 dark:border-rose-900/30 border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20 dark:to-transparent">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-rose-500" />
              </div>
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs">
              Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 lg:px-6 pb-5 space-y-5">
            {/* ── Patient Name ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="surname"
                rules={{ required: 'Surname is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surname *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Santos" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Maria Clara" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="middleInitial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Initial</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. R"
                        maxLength={1}
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameExtension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name Extension</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select extension" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {NAME_EXTENSIONS.map((ext) => (
                          <SelectItem key={ext} value={ext}>
                            {ext}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Date of Birth ───────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              rules={{ required: 'Date of birth is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Date of Birth (MM/DD/YYYY) *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-10"
                      max={format(new Date(), 'yyyy-MM-dd')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Address ─────────────────────────────────────────────────── */}
            <div className="border-l-2 border-l-rose-200 dark:border-l-rose-800 bg-rose-50/30 dark:bg-rose-950/10 rounded-r-lg pl-4 pr-3 py-3 my-1">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" />
                Address
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="barangay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barangay</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select barangay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <div className="max-h-64 overflow-y-auto">
                            {MAKATI_BARANGAYS.map((brgy) => (
                              <SelectItem key={brgy} value={brgy}>
                                {brgy}
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blockLotStreet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block No. &ndash; Lot No. &ndash; Street</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Block 5 Lot 12 Rizal Street"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ── Occupation, Religion, Marital Status, Family, Income ── */}
            <div className="border-l-2 border-l-rose-200 dark:border-l-rose-800 bg-rose-50/30 dark:bg-rose-950/10 rounded-r-lg pl-4 pr-3 py-3 my-1">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                <Briefcase className="h-3.5 w-3.5" />
                Occupation &amp; Demographics
              </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      Occupation
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select occupation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OCCUPATIONS.map((occ) => (
                          <SelectItem key={occ} value={occ}>
                            {occ}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="religion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Religion</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Catholic, Islam" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARITAL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="familyComposition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      Family Composition
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select composition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FAMILY_COMPOSITIONS.map((fc) => (
                          <SelectItem key={fc} value={fc}>
                            {fc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="incomeBracket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Income</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select income bracket" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INCOME_BRACKETS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════
            CARD 2: Health History
        ═══════════════════════════════════════════════════════════════════ */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:border-sky-100/80 transition-all duration-200 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 lg:px-6 border-b border-sky-100/60 dark:border-sky-900/30 border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-50/50 to-transparent dark:from-sky-950/20 dark:to-transparent">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                <Heart className="h-3.5 w-3.5 text-sky-500" />
              </div>
              Health History
            </CardTitle>
            <CardDescription className="text-xs">
              Medical background and current health status
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 lg:px-6 pb-6 space-y-6">
            {/* ── Allergies ──────────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Allergies
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Penicillin, Sulfa drugs, Latex"
                      className="min-h-[72px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── Past Medical History (checkboxes) ───────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Past Medical History
                <span className="text-xs text-muted-foreground font-normal">(Select all that apply)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {PAST_MEDICAL_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2.5 py-2 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-colors duration-150"
                  >
                    <Checkbox
                      checked={pastMedicalSelected.includes(option)}
                      onCheckedChange={() =>
                        setPastMedicalSelected((prev) => toggleItem(prev, option))
                      }
                      className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {pastMedicalSelected.includes('Others (specify)') && (
                <Input
                  placeholder="Please specify..."
                  className="h-9 mt-1"
                  value={pastMedicalOthersText}
                  onChange={(e) => setPastMedicalOthersText(e.target.value)}
                />
              )}
            </div>

            {/* ── Previous Surgery (checkboxes) ───────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                Previous Surgery
                <span className="text-xs text-muted-foreground font-normal">(Select all that apply)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {PREVIOUS_SURGERY_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2.5 py-2 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-colors duration-150"
                  >
                    <Checkbox
                      checked={previousSurgerySelected.includes(option)}
                      onCheckedChange={() =>
                        setPreviousSurgerySelected((prev) => toggleItem(prev, option))
                      }
                      className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {previousSurgerySelected.includes('Others (specify)') && (
                <Input
                  placeholder="Please specify..."
                  className="h-9 mt-1"
                  value={previousSurgeryOthersText}
                  onChange={(e) => setPreviousSurgeryOthersText(e.target.value)}
                />
              )}
            </div>

            {/* ── Trauma & Blood Transfusion (side-by-side) ──────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">History of Trauma</Label>
                <Select value={traumaValue || undefined} onValueChange={setTraumaValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAUMA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {traumaValue === 'yes' && (
                  <Input
                    placeholder="Please specify the trauma..."
                    className="h-9 mt-1"
                    value={traumaSpecify}
                    onChange={(e) => setTraumaSpecify(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">History of Blood Transfusion</Label>
                <Select value={bloodTransfusionValue || undefined} onValueChange={setBloodTransfusionValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_TRANSFUSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bloodTransfusionValue === 'yes' && (
                  <Input
                    placeholder="Please specify..."
                    className="h-9 mt-1"
                    value={bloodTransfusionSpecify}
                    onChange={(e) => setBloodTransfusionSpecify(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* ── Family History (dropdown + conditional checkboxes) ──────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Family History (Maternal and Paternal)
              </Label>
              <Select
                value={familyHistoryDropdown || undefined}
                onValueChange={(val) => {
                  setFamilyHistoryDropdown(val);
                  if (val !== 'present') {
                    setFamilyHistorySelected([]);
                    setFamilyHistoryOthersText('');
                  }
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_HISTORY_DROPDOWN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {familyHistoryDropdown === 'present' && (
                <>
                  <p className="text-xs text-muted-foreground mt-2">
                    Select all that apply:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {FAMILY_HISTORY_OPTIONS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2.5 py-2 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 transition-colors duration-150"
                      >
                        <Checkbox
                          checked={familyHistorySelected.includes(option)}
                          onCheckedChange={() =>
                            setFamilyHistorySelected((prev) => toggleItem(prev, option))
                          }
                          className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {familyHistorySelected.includes('Others (specify)') && (
                    <Input
                      placeholder="Please specify..."
                      className="h-9 mt-1"
                      value={familyHistoryOthersText}
                      onChange={(e) => setFamilyHistoryOthersText(e.target.value)}
                    />
                  )}
                </>
              )}
            </div>

            {/* ── Smoking & Alcohol Intake (side-by-side) ────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Cigarette className="h-3.5 w-3.5 text-muted-foreground" />
                  Smoking
                </Label>
                <Select value={smokingValue || undefined} onValueChange={setSmokingValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMOKING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(smokingValue === 'former' || smokingValue === 'current') && (
                  <Input
                    placeholder="No. of Pack Years"
                    className="h-9 mt-1"
                    value={smokingPackYears}
                    onChange={(e) => setSmokingPackYears(e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Wine className="h-3.5 w-3.5 text-muted-foreground" />
                  Alcohol Intake
                </Label>
                <Select value={alcoholValue || undefined} onValueChange={setAlcoholValue}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALCOHOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(alcoholValue === 'occasional' || alcoholValue === 'regular') && (
                  <Input
                    placeholder="No. of standard drinks per day"
                    className="h-9 mt-1"
                    value={alcoholDrinksPerDay}
                    onChange={(e) => setAlcoholDrinksPerDay(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* ── Drug Use (dropdown + conditional) ───────────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                Drug Use
              </Label>
              <Select value={drugUseValue || undefined} onValueChange={setDrugUseValue}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {DRUG_USE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(drugUseValue === 'past' || drugUseValue === 'current') && (
                <Input
                  placeholder="Type of Substance"
                  className="h-9 mt-1"
                  value={drugUseSubstance}
                  onChange={(e) => setDrugUseSubstance(e.target.value)}
                />
              )}
            </div>

            {/* ── Dietary Pattern (dropdown + conditional) ────────────────── */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Salad className="h-3.5 w-3.5 text-muted-foreground" />
                Dietary Pattern
              </Label>
              <Select value={dietaryPatternValue || undefined} onValueChange={setDietaryPatternValue}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {DIETARY_PATTERN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dietaryPatternValue === 'special' && (
                <Input
                  placeholder="Please specify the special diet..."
                  className="h-9 mt-1"
                  value={dietaryPatternSpecify}
                  onChange={(e) => setDietaryPatternSpecify(e.target.value)}
                />
              )}
            </div>

            {/* ── Physical Activity & Sleep Pattern (side-by-side) ──────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                  Physical Activity
                </Label>
                <Select value={physicalActivity || undefined} onValueChange={setPhysicalActivity}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHYSICAL_ACTIVITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                  Sleep Pattern
                </Label>
                <Select value={sleepPattern || undefined} onValueChange={setSleepPattern}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLEEP_PATTERN_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════════
            ACTIONS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-4">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 text-muted-foreground hover:bg-rose-50 gap-2"
            onClick={() => setCurrentView('patients')}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2 min-w-[140px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                Add Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
