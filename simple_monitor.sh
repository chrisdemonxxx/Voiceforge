#!/bin/bash
# Simple continuous HF Space monitor

SPACE_APP_URL="https://chrisdemonxxx-voiceforgeai.hf.space"
CHECK_INTERVAL=30
MAX_CHECKS=120  # 1 hour with 30s intervals

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          Monitoring HF Space Deployment Status                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "URL: ${SPACE_APP_URL}"
echo "Check interval: ${CHECK_INTERVAL}s"
echo "Max duration: ~$((MAX_CHECKS * CHECK_INTERVAL / 60)) minutes"
echo ""
echo "═══════════════════════════════════════════════════════════════════"

check_count=0
last_status=""

while [ $check_count -lt $MAX_CHECKS ]; do
    check_count=$((check_count + 1))
    elapsed=$((check_count * CHECK_INTERVAL))
    elapsed_min=$((elapsed / 60))
    elapsed_sec=$((elapsed % 60))

    # Check health endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SPACE_APP_URL}/api/health" 2>/dev/null || echo "000")

    timestamp=$(date '+%H:%M:%S')

    case $HTTP_CODE in
        200)
            echo ""
            echo "╔═══════════════════════════════════════════════════════════════╗"
            echo "║  ✅ SUCCESS! Space is RUNNING!                                ║"
            echo "╚═══════════════════════════════════════════════════════════════╝"
            echo ""
            echo "🌐 URL: ${SPACE_APP_URL}"
            echo "⏱️  Total time: ${elapsed_min}m ${elapsed_sec}s"
            echo "🔍 Checks performed: ${check_count}"
            echo ""
            exit 0
            ;;
        503|502|504)
            status="BUILDING/STARTING"
            ;;
        403|401)
            status="PRIVATE/RESTRICTED"
            ;;
        000)
            status="UNAVAILABLE"
            ;;
        *)
            status="ERROR (HTTP ${HTTP_CODE})"
            ;;
    esac

    # Only print status change or every 10 checks
    if [ "$status" != "$last_status" ] || [ $((check_count % 10)) -eq 0 ]; then
        echo "[${timestamp}] Check ${check_count}/${MAX_CHECKS} - Status: ${status} - Elapsed: ${elapsed_min}m ${elapsed_sec}s"
        last_status="$status"
    else
        printf "\r[${timestamp}] Check ${check_count}/${MAX_CHECKS} - Status: ${status} - Elapsed: ${elapsed_min}m ${elapsed_sec}s     "
    fi

    sleep $CHECK_INTERVAL
done

echo ""
echo "⏰ Monitoring timeout reached"
echo "🔍 Final status: ${last_status}"
echo "💡 Check manually at: ${SPACE_APP_URL}"
exit 1
