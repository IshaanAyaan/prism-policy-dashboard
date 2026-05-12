"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Boxes,
  CircleHelp,
  ClipboardList,
  Download,
  ExternalLink,
  FileChartColumn,
  FlaskConical,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MechanismSpace } from "@/components/mechanism-space";
import {
  classifyLawText,
  emptyLawScoreResult,
  type LawScoreResult,
} from "@/lib/mechanism-scorer";
import {
  BLOG_URL,
  COHORT_URL,
  axisPercent,
  blogWeeks,
  calculateScenario,
  crashModels,
  eventStudy,
  formatRate,
  formatSigned,
  getLatestState,
  getStateMechanismScores,
  getStateSeries,
  getTopScenarioDeltas,
  headline,
  mechanismModels,
  numeric,
  states,
  type MechanismScores,
} from "@/lib/prism-data";
import { cn } from "@/lib/utils";

const DEFAULT_LAW =
  "The state raises the beer excise tax by $0.10 per gallon, funds compliance checks, and increases penalties for underage alcohol sales.";

const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "#simulator", label: "Simulator", icon: SlidersHorizontal },
  { href: "#law", label: "Law Text", icon: Scale },
  { href: "#space", label: "Mechanism Space", icon: Boxes },
  { href: "#story", label: "Project Story", icon: BookOpen },
  { href: "#poster", label: "Poster", icon: FileChartColumn },
  { href: "#limits", label: "Limits", icon: TriangleAlert },
];

const mechanismLabels = {
  price: "Price",
  access: "Access",
  enforcement: "Enforcement",
};

const mechanismIndicatorClasses = {
  price: "[&_[data-slot=progress-indicator]]:bg-[#0f9f9a]",
  access: "[&_[data-slot=progress-indicator]]:bg-[#d47a21]",
  enforcement: "[&_[data-slot=progress-indicator]]:bg-[#be3455]",
};

export function PrismDashboard() {
  const [mounted, setMounted] = useState(false);
  const [selectedState, setSelectedState] = useState("AZ");
  const [beerTaxDelta, setBeerTaxDelta] = useState(0.1);
  const [accessShift, setAccessShift] = useState(0);
  const [enforcementShift, setEnforcementShift] = useState(1);
  const [lawDraft, setLawDraft] = useState(DEFAULT_LAW);
  const [lawScore, setLawScore] = useState<LawScoreResult>(() =>
    emptyLawScoreResult(DEFAULT_LAW),
  );
  const [isAnalyzingLaw, setIsAnalyzingLaw] = useState(false);
  const [lawError, setLawError] = useState<string | null>(null);

  const selected = states.find((state) => state.abbrev === selectedState);
  const stateName = selected?.name ?? selectedState;
  const series = useMemo(() => getStateSeries(selectedState), [selectedState]);
  const latest = useMemo(() => getLatestState(selectedState), [selectedState]);
  const stateScores = useMemo(
    () => getStateMechanismScores(selectedState),
    [selectedState],
  );
  const scenario = useMemo(
    () =>
      calculateScenario({
        state: selectedState,
        beerTaxDelta,
        accessShift,
        enforcementShift,
      }),
    [accessShift, beerTaxDelta, enforcementShift, selectedState],
  );
  const scenarioVector = useMemo(
    () => contributionVector(scenario.contributions),
    [scenario.contributions],
  );

  const stateChart = series.map((row) => ({
    year: row.year,
    impaired: row.rate_impaired_per100k,
    alcohol: row.rate_alcohol_involved_per100k,
  }));
  const modelRows = crashModels.slice(0, 5).map((row) => ({
    model: row.model.replace("Regressor", ""),
    rmse: row.test_rmse,
    r2: row.test_r2,
  }));
  const scenarioDeltas = getTopScenarioDeltas(9);
  const selectedMechanismModel = mechanismModels[0];
  const lawScores = lawScore.scores;

  async function handleLawAnalysis(text: string) {
    const cleaned = text.trim();

    if (!cleaned) {
      setLawError("Enter law text before running the model.");
      startTransition(() => setLawScore(emptyLawScoreResult()));
      return;
    }

    setIsAnalyzingLaw(true);
    setLawError(null);

    try {
      const nextScore = await classifyLawText(cleaned);

      startTransition(() => setLawScore(nextScore));
    } catch {
      setLawError(
        "The local model could not finish. Try again after the first download completes.",
      );
    } finally {
      setIsAnalyzingLaw(false);
    }
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runInitialAnalysis() {
      setIsAnalyzingLaw(true);

      try {
        const nextScore = await classifyLawText(DEFAULT_LAW);

        if (cancelled) {
          return;
        }

        startTransition(() => setLawScore(nextScore));
      } catch {
        if (!cancelled) {
          setLawError(
            "The local model did not load on first pass. You can try Analyze Law again.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsAnalyzingLaw(false);
        }
      }
    }

    void runInitialAnalysis();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbf9_0%,#eef4f1_48%,#f8faf9_100%)]">
      <MobileHeader />
      <SideRail />

      <main className="lg:pl-72">
        <section
          id="dashboard"
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
        >
          <div className="flex flex-col gap-4 rounded-xl border bg-white/82 p-4 shadow-sm backdrop-blur sm:p-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <Badge className="mb-3 w-fit bg-primary/12 text-primary ring-1 ring-primary/20">
                Senior Project final product
              </Badge>
              <h1 className="max-w-5xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                PRISM Alcohol Policy Impact Atlas
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                A transparent evidence dashboard for exploring alcohol-policy
                mechanisms, next-year risk forecasts, and the limits of causal
                interpretation.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <a
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "justify-start",
                )}
                href={BLOG_URL}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen />
                Blog
                <ArrowUpRight />
              </a>
              <HelpDrawer />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={Sparkles}
              label="Mechanism Macro-F1"
              value={headline.macroF1}
            />
            <MetricCard
              icon={Gauge}
              label="Forecast RMSE"
              value={headline.rmse}
            />
            <MetricCard
              icon={GitBranch}
              label="Forecast R²"
              value={headline.r2}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
            <Card className="rounded-xl bg-white/94">
              <CardHeader className="gap-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      State Forecast Workspace
                    </CardTitle>
                    <CardDescription>
                      Select a state, then compare the observed pattern with a
                      policy scenario.
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedState}
                    onValueChange={(value) => setSelectedState(String(value))}
                  >
                    <SelectTrigger className="w-full bg-white sm:w-64">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.abbrev} value={state.abbrev}>
                          {state.name} ({state.abbrev})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <ChartBox mounted={mounted} className="h-[19rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stateChart} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d8e1dd" />
                        <XAxis
                          dataKey="year"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          width={42}
                        />
                        <ChartTooltip
                          formatter={(value) => formatRate(Number(value), 2)}
                          labelFormatter={(label) => `Year ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="impaired"
                          name="Impaired fatality rate"
                          stroke="#0f9f9a"
                          strokeWidth={2.2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="alcohol"
                          name="Alcohol-involved rate"
                          stroke="#be3455"
                          strokeWidth={1.8}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <div className="grid gap-3 rounded-lg border bg-[#f8fbfa] p-3">
                    <Fact label="State" value={`${stateName} (${selectedState})`} />
                    <Fact
                      label="Latest impaired rate"
                      value={`${formatRate(latest.rate_impaired_per100k)} per 100k`}
                    />
                    <Fact
                      label="Beer tax"
                      value={`$${formatRate(latest.beer_tax_usd_per_gallon, 2)} / gallon`}
                    />
                    <Fact
                      label="Text coverage"
                      value={latest.coverage_provenance ?? "n/a"}
                    />
                    <Fact
                      label="Text quality"
                      value={axisPercent(numeric(latest.text_quality_score))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Mechanism Profile</CardTitle>
                <CardDescription>
                  The state-year text signal projected into PRISM channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <MechanismBars scores={stateScores} />
                <Separator />
                <div className="rounded-lg border bg-[#fbf6f4] p-3 text-sm leading-6 text-slate-700">
                  <p className="font-medium text-slate-950">
                    Predictive, not automatic proof.
                  </p>
                  <p>
                    Forecast changes show how the trained model responds to
                    policy features. The event-study coefficient is a separate
                    directional causal audit around beer-tax events.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <section
            id="simulator"
            className="grid gap-4 xl:grid-cols-[minmax(22rem,0.75fr)_minmax(0,1.25fr)]"
          >
            <Card className="rounded-xl bg-white/94">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Scenario Simulator</CardTitle>
                    <CardDescription>
                      Change policy levers and compare baseline with scenario
                      forecast.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Reset sliders"
                    onClick={() => {
                      setBeerTaxDelta(0.1);
                      setAccessShift(0);
                      setEnforcementShift(1);
                    }}
                  >
                    <RotateCcw />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Lever
                  label="Beer tax shift"
                  value={`$${beerTaxDelta.toFixed(2)} / gallon`}
                  minLabel="-$0.20"
                  maxLabel="+$0.50"
                  slider={
                    <Slider
                      min={-0.2}
                      max={0.5}
                      step={0.05}
                      value={[beerTaxDelta]}
                      onValueChange={(value) =>
                        setBeerTaxDelta(sliderNumber(value))
                      }
                    />
                  }
                />
                <Lever
                  label="Sunday-sales/access shift"
                  value={accessLabel(accessShift)}
                  minLabel="Stricter"
                  maxLabel="More available"
                  slider={
                    <Slider
                      min={-1}
                      max={1}
                      step={1}
                      value={[accessShift]}
                      onValueChange={(value) =>
                        setAccessShift(sliderNumber(value))
                      }
                    />
                  }
                />
                <Lever
                  label="Underage-purchase enforcement"
                  value={enforcementLabel(enforcementShift)}
                  minLabel="Softer"
                  maxLabel="Stricter"
                  slider={
                    <Slider
                      min={-1}
                      max={1}
                      step={1}
                      value={[enforcementShift]}
                      onValueChange={(value) =>
                        setEnforcementShift(sliderNumber(value))
                      }
                    />
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Baseline vs Scenario</CardTitle>
                <CardDescription>
                  Forecasted alcohol-impaired fatality rate per 100k for the
                  next state-year.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ForecastStat
                    label="Baseline"
                    value={formatRate(scenario.baseline)}
                    tone="neutral"
                  />
                  <ForecastStat
                    label="Scenario"
                    value={formatRate(scenario.scenario)}
                    tone={scenario.delta <= 0 ? "good" : "risk"}
                  />
                  <ForecastStat
                    label="Delta"
                    value={formatSigned(scenario.delta)}
                    tone={scenario.delta <= 0 ? "good" : "risk"}
                  />
                </div>
                <ChartBox mounted={mounted} className="mt-5 h-[14rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Baseline",
                          value: scenario.baseline,
                          fill: "#254d74",
                        },
                        {
                          name: "Scenario",
                          value: scenario.scenario,
                          fill: scenario.delta <= 0 ? "#0f9f9a" : "#be3455",
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <ChartTooltip
                        formatter={(value) => formatRate(Number(value), 2)}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartBox>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Contribution
                    label="Price"
                    value={scenario.contributions.price}
                    color="text-[#0f9f9a]"
                  />
                  <Contribution
                    label="Access"
                    value={scenario.contributions.access}
                    color="text-[#d47a21]"
                  />
                  <Contribution
                    label="Enforcement"
                    value={scenario.contributions.enforcement}
                    color="text-[#be3455]"
                  />
                </div>
                <p className="mt-4 rounded-lg border bg-[#f8fbfa] p-3 text-sm leading-6 text-slate-700">
                  Scenario interval: {formatRate(scenario.intervalLow)} to{" "}
                  {formatRate(scenario.intervalHigh)} per 100k. This interval is
                  carried through from the forecast artifact and shifted with the
                  simulated point estimate.
                </p>
              </CardContent>
            </Card>
          </section>

          <section
            id="law"
            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]"
          >
            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Law Interpreter</CardTitle>
                <CardDescription>
                  Analyze a hypothetical law with a small local MobileBERT
                  zero-shot model running in the browser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={lawDraft}
                  onChange={(event) => setLawDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      void handleLawAnalysis(lawDraft);
                    }
                  }}
                  className="min-h-40 resize-none bg-white text-base leading-7"
                  aria-label="Hypothetical law text"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-6 text-slate-600">
                    First run downloads the model into browser cache.
                  </div>
                  <Button
                    onClick={() => void handleLawAnalysis(lawDraft)}
                    disabled={isAnalyzingLaw}
                    className="sm:min-w-40"
                  >
                    {isAnalyzingLaw ? (
                      <>
                        <LoaderCircle className="animate-spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        <Brain />
                        Analyze Law
                      </>
                    )}
                  </Button>
                </div>
                {lawError ? (
                  <p className="rounded-lg border border-[#e9b4bf] bg-[#fff3f6] p-3 text-sm leading-6 text-[#8b203a]">
                    {lawError}
                  </p>
                ) : (
                  <p className="rounded-lg border bg-[#fbf6f4] p-3 text-sm leading-6 text-slate-700">
                    {lawScore.summary}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Mechanism Result</CardTitle>
                <CardDescription>
                  These are model confidence scores for each mechanism, not
                  estimates of how large the real-world policy effect would be.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <MechanismBars scores={lawScores} />
                <p className="rounded-lg border bg-[#f8fbfa] p-3 text-sm leading-6 text-slate-600">
                  A big dollar amount can still matter a lot in real policy
                  terms. These percentages only show how strongly the model
                  reads the text as price, access, or enforcement language.
                </p>
                <div className="grid gap-3">
                  {lawScore.ranked.map((entry) => (
                    <div
                      key={entry.key}
                      className="rounded-lg border bg-[#f8fbfa] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{entry.label}</p>
                        <p className="text-sm tabular-nums text-slate-500">
                          {axisPercent(entry.score)}
                        </p>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {entry.description}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="rounded-lg border bg-white p-3 text-sm leading-6 text-slate-600">
                  Model: <span className="font-medium text-slate-900">{lawScore.model}</span>
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="space">
            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">
                  3D Price / Access / Enforcement Space
                </CardTitle>
                <CardDescription>
                  Blue is the selected state profile, red is the analyzed law,
                  and green is the current scenario lever mix.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <MechanismSpace
                  stateName={selectedState}
                  stateScores={stateScores}
                  lawScores={lawScores}
                  scenarioVector={scenarioVector}
                />
                <p>
                  The red point updates only after you click Analyze Law, so the
                  3D space stays tied to the model output instead of live typing.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="story">
            <Tabs defaultValue="arc" className="rounded-xl border bg-white/94 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">
                    Project Story
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    The SRP arc from messy policy data to a final public tool.
                  </p>
                </div>
                <TabsList className="w-full sm:w-fit">
                  <TabsTrigger value="arc">Weekly Arc</TabsTrigger>
                  <TabsTrigger value="models">Model Evidence</TabsTrigger>
                  <TabsTrigger value="causal">Causal Audit</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="arc" className="mt-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {blogWeeks.map((week) => (
                    <div
                      key={week.week}
                      className="rounded-lg border bg-[#f8fbfa] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/12 text-primary">
                          Week {week.week}
                        </Badge>
                        <h3 className="font-medium text-slate-950">
                          {week.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {week.focus}
                      </p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="models" className="mt-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
                  <ChartBox mounted={mounted} className="h-[20rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelRows} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis
                          dataKey="model"
                          type="category"
                          width={140}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip
                          formatter={(value) => formatRate(Number(value), 3)}
                        />
                        <Bar dataKey="rmse" fill="#0f9f9a" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">RMSE</TableHead>
                        <TableHead className="text-right">R²</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crashModels.slice(0, 5).map((row) => (
                        <TableRow key={row.model}>
                          <TableCell className="font-medium">
                            {row.model.replace("Regressor", "")}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatRate(row.test_rmse, 3)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatRate(row.test_r2, 3)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-4 rounded-lg border bg-[#f8fbfa] p-3 text-sm leading-6 text-slate-700">
                  Text benchmark selected model:{" "}
                  <span className="font-medium">
                    {selectedMechanismModel?.model ?? "tfidf_semisupervised_ffn"}
                  </span>{" "}
                  with Macro-F1 {headline.macroF1}.
                </p>
              </TabsContent>
              <TabsContent value="causal" className="mt-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                  <ChartBox mounted={mounted} className="h-[20rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={eventStudy}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#d8e1dd" />
                        <XAxis
                          dataKey="event_time"
                          tickLine={false}
                          axisLine={false}
                          label={{
                            value: "Years from beer-tax increase",
                            position: "insideBottom",
                            offset: -2,
                          }}
                        />
                        <YAxis tickLine={false} axisLine={false} width={42} />
                        <ChartTooltip
                          formatter={(value) => formatRate(Number(value), 3)}
                          labelFormatter={(label) => `Event time ${label}`}
                        />
                        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                        <Area
                          type="monotone"
                          dataKey="ci_high"
                          stroke="transparent"
                          fill="#0f9f9a"
                          fillOpacity={0.08}
                        />
                        <Area
                          type="monotone"
                          dataKey="ci_low"
                          stroke="transparent"
                          fill="#ffffff"
                          fillOpacity={1}
                        />
                        <Line
                          type="monotone"
                          dataKey="coef"
                          stroke="#0f9f9a"
                          strokeWidth={2.2}
                          dot={{ r: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartBox>
                  <div className="rounded-lg border bg-[#fbf6f4] p-4 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-slate-950">
                      Event-study framing
                    </p>
                    <p className="mt-2">
                      The average post coefficient is {headline.causalPost} per
                      100k around beer-tax events, with a pretrend diagnostic of{" "}
                      {headline.pretrendP}. That is directional evidence, not a
                      universal policy guarantee.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </section>

          <section id="poster" className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-xl bg-white/94">
              <CardHeader className="gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">Poster Preview</CardTitle>
                    <CardDescription>
                      Curated from the project poster artifact for presentation use.
                    </CardDescription>
                  </div>
                  <a
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "justify-start bg-white",
                    )}
                    href="/assets/azsef-poster-preview.jpg"
                    download="prism-poster-preview.jpg"
                  >
                    <Download />
                    Download Image
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border bg-white">
                  <Image
                    src="/assets/azsef-poster-preview.jpg"
                    alt="Poster preview for PRISM"
                    width={1800}
                    height={1350}
                    className="h-auto w-full"
                    priority={false}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Research Pipeline</CardTitle>
                <CardDescription>
                  How the final product connects the poster, deck, and repo.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="overflow-hidden rounded-lg border bg-white">
                  <Image
                    src="/assets/pipeline-architecture.png"
                    alt="PRISM pipeline architecture"
                    width={1600}
                    height={900}
                    className="h-auto w-full"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SmallEvidence
                    icon={ClipboardList}
                    title="Panel"
                    text="51 jurisdictions across 2003-2023."
                  />
                  <SmallEvidence
                    icon={FlaskConical}
                    title="Text"
                    text="Policy chunks scored as mechanisms."
                  />
                  <SmallEvidence
                    icon={Gauge}
                    title="Forecast"
                    text="Random Forest selected by held-out RMSE."
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="limits" className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Limitations</CardTitle>
                <CardDescription>
                  Built into the product instead of hidden in fine print.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-slate-700">
                <Limit
                  title="Teen outcome coverage is sparse"
                  text="YRBS teen current-use and binge-drinking data are useful secondary outcomes, but coverage is incomplete enough that fatality risk remains the main outcome."
                />
                <Limit
                  title="Policy text can be supplemental"
                  text="Many state-years rely on supplemental text sources. The dashboard surfaces coverage provenance and text quality so users know when the signal is thinner."
                />
                <Limit
                  title="Beer-tax causal events are limited"
                  text="The causal audit focuses on a small set of beer-tax increase events, so it is directional evidence rather than broad proof for every policy lever."
                />
                <Limit
                  title="Forecasts are not policy promises"
                  text="Scenario outputs show model movement under changed features. They do not prove what would happen after a real law passes."
                />
              </CardContent>
            </Card>

            <Card className="rounded-xl bg-white/94">
              <CardHeader>
                <CardTitle className="text-xl">Largest Scenario Responses</CardTitle>
                <CardDescription>
                  States with the biggest modeled movement in the curated PRISM
                  scenario file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartBox mounted={mounted} className="h-[22rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenarioDeltas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="state"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={42}
                      />
                      <ReferenceLine x={0} stroke="#64748b" />
                      <ChartTooltip
                        formatter={(value) => formatSigned(Number(value), 3)}
                      />
                      <Bar
                        dataKey="delta"
                        fill="#d47a21"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartBox>
              </CardContent>
            </Card>
          </section>
        </section>
      </main>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-sidebar px-4 py-3 text-sidebar-foreground shadow-sm lg:hidden">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-sidebar-foreground/60">
          PRISM
        </p>
        <p className="font-semibold">Ishaan Ranjan</p>
      </div>
      <HelpDrawer compact />
    </div>
  );
}

function SideRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:flex">
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-sidebar-foreground/60">
          Alcohol Policy Atlas
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">PRISM</h2>
        <p className="mt-2 text-sm text-sidebar-foreground/72">
          Ishaan Ranjan
        </p>
      </div>

      <nav className="mt-5 grid gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Icon className="size-4" />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-2">
        <HelpDrawer
          className="justify-start border-transparent bg-[#dff4ee] text-slate-950 shadow-sm hover:bg-[#cae7df]"
          labelClassName="text-slate-950"
          variant="default"
        />
        <a
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "justify-start bg-white/10 text-sidebar-foreground hover:bg-white/16",
          )}
          href={BLOG_URL}
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen />
          Ishaan R. blog
          <ExternalLink />
        </a>
        <a
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          href={COHORT_URL}
          target="_blank"
          rel="noreferrer"
        >
          BASIS Peoria 2026
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </aside>
  );
}

function HelpDrawer({
  compact = false,
  className,
  labelClassName,
  variant,
}: {
  compact?: boolean;
  className?: string;
  labelClassName?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant={compact ? "secondary" : variant ?? "outline"}
            size={compact ? "icon" : "lg"}
            aria-label="Open PRISM help"
            className={cn(compact ? "" : "justify-start", className)}
          />
        }
      >
        <CircleHelp />
        {!compact && <span className={labelClassName}>How to Try PRISM</span>}
      </SheetTrigger>
      <SheetContent className="w-[min(92vw,34rem)] overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-2xl">How to Try PRISM</SheetTitle>
          <SheetDescription>
            Use the app like a presentation sandbox, not a causal oracle.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 px-4 pb-6">
          {[
            "Select a state from the forecast workspace.",
            "Adjust beer tax, Sunday-sales/access, and enforcement sliders.",
            "Compare the baseline forecast against the scenario forecast.",
            "Type a hypothetical law and click Analyze Law.",
            "Read the price, access, and enforcement mechanism result.",
            "Treat every scenario as predictive evidence, not causal proof.",
          ].map((step, index) => (
            <div key={step} className="flex gap-3 rounded-lg border p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
          <div className="rounded-lg border bg-[#fbf6f4] p-3 text-sm leading-6 text-slate-700">
            PRISM combines APIS, FARS, FHWA, FRED, and YRBS into a state-year
            panel, then interprets policy text through price, access, and
            enforcement mechanisms.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-xl bg-white/94">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-950">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartBox({
  mounted,
  className,
  children,
}: {
  mounted: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border bg-white p-3", className)}>
      {mounted ? (
        children
      ) : (
        <div className="flex h-full min-h-40 items-center justify-center rounded-md bg-[#f8fbfa] text-sm text-slate-500">
          Loading chart
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MechanismBars({ scores }: { scores: MechanismScores }) {
  return (
    <div className="grid gap-4">
      {(Object.keys(scores) as Array<keyof MechanismScores>).map((key) => (
        <div key={key} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-800">
              {mechanismLabels[key]}
            </span>
            <span className="tabular-nums text-slate-500">
              {axisPercent(scores[key])}
            </span>
          </div>
          <Progress
            value={Math.round(scores[key] * 100)}
            className={mechanismIndicatorClasses[key]}
          />
        </div>
      ))}
    </div>
  );
}

function Lever({
  label,
  value,
  minLabel,
  maxLabel,
  slider,
}: {
  label: string;
  value: string;
  minLabel: string;
  maxLabel: string;
  slider: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-slate-900">{label}</p>
        <Badge variant="secondary" className="tabular-nums">
          {value}
        </Badge>
      </div>
      {slider}
      <div className="flex justify-between text-xs text-slate-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function ForecastStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "good" | "risk";
}) {
  const toneClass =
    tone === "good"
      ? "border-[#0f9f9a]/30 bg-[#effaf7] text-[#0a6c68]"
      : tone === "risk"
        ? "border-[#be3455]/30 bg-[#fff1f4] text-[#8b203a]"
        : "border-slate-200 bg-slate-50 text-slate-900";

  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Contribution({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", color)}>
        {formatSigned(value)}
      </p>
    </div>
  );
}

function SmallEvidence({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-[#f8fbfa] p-3">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 font-medium text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Limit({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border bg-[#fbf6f4] p-3">
      <p className="font-medium text-slate-950">{title}</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}

function accessLabel(value: number) {
  if (value < 0) {
    return "More restricted";
  }
  if (value > 0) {
    return "More available";
  }
  return "No access shift";
}

function enforcementLabel(value: number) {
  if (value < 0) {
    return "Softer checks";
  }
  if (value > 0) {
    return "Stricter checks";
  }
  return "No enforcement shift";
}

function contributionVector(values: MechanismScores): MechanismScores {
  const absolute = {
    price: Math.abs(values.price),
    access: Math.abs(values.access),
    enforcement: Math.abs(values.enforcement),
  };
  const max = Math.max(absolute.price, absolute.access, absolute.enforcement, 0.01);

  return {
    price: absolute.price / max,
    access: absolute.access / max,
    enforcement: absolute.enforcement / max,
  };
}

function sliderNumber(value: number | readonly number[]) {
  return Array.isArray(value) ? Number(value[0] ?? 0) : Number(value);
}
