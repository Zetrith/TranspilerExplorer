using HarmonyLib;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace TranspilerExplorer
{
    static class HarmonyPatch_UpdateWrapper_Patch
    {
        public static ConcurrentBag<(MethodBase, MethodInfo)> erroringTranspilers = new ConcurrentBag<(MethodBase, MethodInfo)>();

        static void Finalizer(MethodBase original, PatchInfo patchInfo, Exception __exception)
        {
            if (__exception != null)
                foreach (var t in patchInfo.transpilers)
                    erroringTranspilers.Add((original, t.PatchMethod));
        }
    }
}
