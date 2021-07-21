using HarmonyLib;
using ICSharpCode.Decompiler;
using ICSharpCode.Decompiler.DebugInfo;
using ICSharpCode.Decompiler.IL;
using ICSharpCode.Decompiler.IL.Transforms;
using ICSharpCode.Decompiler.TypeSystem;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Reflection.Emit;
using System.Text;
using System.Threading.Tasks;

namespace TranspilerExplorer
{
    public static class VariableNames
    {
        public static string[] CollectVarNames(DecompilerSettingsWrapper d)
        {
            var func = d.ilfuncs.First().Value;
            var locals = func.Variables.Where(v => v.Index.HasValue).ToArray();
            if (locals.Length == 0) return null;

            var names = new string[locals.Max(l => l.Index.Value) + 1];

            foreach (var l in locals)
                names[l.Index.Value] = l.Name;

            return names;
        }
    }

    public class DecompilerSettingsWrapper : DecompilerSettings
    {
        public Dictionary<IMethod, ILFunction> ilfuncs = new Dictionary<IMethod, ILFunction>();
    }

    [HotSwappable]
    public class VariableNameProvider : IDebugInfoProvider
    {
        private string[] vars;

        public VariableNameProvider(string[] vars)
        {
            this.vars = vars;
        }

        public string Description => throw new NotImplementedException();

        public string SourceFileName => throw new NotImplementedException();

        public IList<SequencePoint> GetSequencePoints(System.Reflection.Metadata.MethodDefinitionHandle method)
        {
            return null;
        }

        public IList<Variable> GetVariables(System.Reflection.Metadata.MethodDefinitionHandle method)
        {
            throw new NotImplementedException();
        }

        public bool TryGetName(System.Reflection.Metadata.MethodDefinitionHandle method, int index, out string name)
        {
            name = vars?.ElementAtOrDefault(index);
            if (index >= vars.Length)
                name = $"newvar{index}";
            return name != null;
        }
    }

    [HarmonyPatch(typeof(AssignVariableNames), nameof(AssignVariableNames.Run))]
    static class AssignVariableNamesPatch
    {
        static void Postfix(ILFunction function, ILTransformContext context)
        {
            // Track assigned variable names
            if (context.Settings is DecompilerSettingsWrapper wrapper)
                wrapper.ilfuncs[function.Method] = function;
        }
    }

    [HarmonyPatch(typeof(AssignVariableNames), "GenerateNameForVariable")]
    static class AssignVariableNamesPatch2
    {
        static MethodBase processMethod = AccessTools.Method(typeof(AssignVariableNamesPatch2), nameof(ProcessProposedName));

        static IEnumerable<CodeInstruction> Transpiler(IEnumerable<CodeInstruction> insts)
        {
            foreach (var inst in insts)
            {
                yield return inst;
                if (inst.operand is MethodBase m && m.Name == "SplitName")
                {
                    yield return new CodeInstruction(OpCodes.Ldarg_1);
                    yield return new CodeInstruction(OpCodes.Call, processMethod);
                }
            }
        }

        static string[] varKindSuffix = new[]
        {
            "l", "pil", "pirl", "ul", "fl", "it", "p", "es", "s", "na", "dcl", "pl", "dit"
        };

        static string ProcessProposedName(string proposedName, ILVariable var)
        {
            return proposedName + varKindSuffix[(int)var.Kind];
        }
    }
}
